import { createHash, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, NotFoundException, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Instructor } from '../generated/mjscc/client.js';
import { atLeast, clientIp } from '../security/request.js';
import { mjsccConfig } from './config.js';
import { students } from './content.js';
import { EvaluationService, view } from './evaluation.service.js';
import { MjsccRateLimit } from './guards.js';
import { CurrentInstructor, InstructorSignedIn, MjsccSessions } from './sessions.js';
import { isTranscriptFile } from './transcript-details.js';
import { TranscriptsService } from './transcripts.service.js';

function parse<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw new BadRequestException({ code: 'invalid' });
  return result.data;
}

const signInBody = z
  .object({
    // letters in any script (Thaana's vowel marks included), digits, spaces, . ' ’ -
    name: z.string().trim().min(2).max(40).regex(/^[\p{L}\p{M}\p{N} .'’-]+$/u),
    code: z.string().max(100),
  })
  .strict();

const scoreBody = z
  .object({
    student: z.number().int().min(1).max(students.length),
    part: z.enum(['THEORY', 'DRILL', 'COMMANDING', 'INSPECTION']),
    item: z.number().int().min(1),
    value: z.number().int().min(0),
  })
  .strict();

const noteBody = z.object({ student: z.number().int().min(1).max(students.length), text: z.string().trim().max(1000) }).strict();

// the day's code, compared without regard to case or the spaces around it, in constant time
const digest = (code: string) => createHash('sha256').update(code.trim().toLowerCase()).digest();
const codeMatches = (code: string) => timingSafeEqual(digest(code), digest(mjsccConfig!.accessCode));

// The MJSCC instructor evaluation's API, for its own site only (see fromEvaluationSite).
@Controller('mjscc')
export class MjsccController {
  constructor(
    private readonly sessions: MjsccSessions,
    private readonly limits: MjsccRateLimit,
    private readonly evaluation: EvaluationService,
    private readonly transcripts: TranscriptsService,
  ) {}

  // Signs in with a name on the list and the day's code (checked first, so the list can't be probed
  // without it). Each IP address gets 20 tries per 15 minutes.
  @Post('session')
  @HttpCode(200)
  async signIn(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.limits.enforce(`sign-in:${clientIp(req)}`, 20, 900);
    const { name, code } = parse(signInBody, body);
    if (!(await atLeast(300, Promise.resolve(codeMatches(code))))) {
      throw new HttpException({ code: 'wrong_code' }, HttpStatus.UNAUTHORIZED);
    }
    const instructor = await this.evaluation.instructorNamed(name);
    if (!instructor) throw new HttpException({ code: 'unknown_name' }, HttpStatus.UNAUTHORIZED);
    await this.sessions.revoke(req);
    await this.sessions.start(res, instructor.id);
    return { instructor: view(instructor) };
  }

  // the signed-in instructor, or null
  @Get('session')
  async session(@Req() req: Request) {
    const instructor = await this.sessions.current(req);
    return { instructor: instructor ? view(instructor) : null };
  }

  @Delete('session')
  @HttpCode(204)
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.sessions.end(req, res);
  }

  @Get('content')
  @UseGuards(InstructorSignedIn)
  content() {
    return this.evaluation.content();
  }

  // An answer that's a picture. Images load without CORS, so this one says the evaluation's site
  // (the same site, agee.pro) may show it; the browser keeps it for the day.
  @Get('answers/:question')
  @UseGuards(InstructorSignedIn)
  answer(@Param('question') question: string, @Res() res: Response) {
    const png = /^\d{1,2}$/.test(question) ? this.evaluation.answerImage(Number(question)) : null;
    if (!png) throw new NotFoundException({ code: 'not_found' });
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=86400', 'Cross-Origin-Resource-Policy': 'same-site' });
    res.send(png);
  }

  @Get('scores')
  @UseGuards(InstructorSignedIn)
  mine(@CurrentInstructor() instructor: Instructor) {
    return this.evaluation.mine(instructor);
  }

  @Post('scores')
  @HttpCode(204)
  @UseGuards(InstructorSignedIn)
  async score(@Body() body: unknown, @CurrentInstructor() instructor: Instructor) {
    await this.evaluation.score(instructor, parse(scoreBody, body));
  }

  @Post('notes')
  @HttpCode(204)
  @UseGuards(InstructorSignedIn)
  async note(@Body() body: unknown, @CurrentInstructor() instructor: Instructor) {
    const { student, text } = parse(noteBody, body);
    await this.evaluation.note(instructor, student, text);
  }

  @Post('finish')
  @HttpCode(200)
  @UseGuards(InstructorSignedIn)
  async finish(@CurrentInstructor() instructor: Instructor) {
    return { instructor: view(await this.evaluation.finish(instructor)) };
  }

  @Post('reopen')
  @HttpCode(200)
  @UseGuards(InstructorSignedIn)
  async reopen(@CurrentInstructor() instructor: Instructor) {
    return { instructor: view(await this.evaluation.reopen(instructor)) };
  }

  // the marks, and whether this instructor can export transcripts (the Platoon In-Charge, once they're out)
  @Get('results')
  @UseGuards(InstructorSignedIn)
  async results(@CurrentInstructor() instructor: Instructor) {
    const results = await this.evaluation.results(instructor);
    return { ...results, transcripts: results.open && (await this.transcripts.canExport(instructor)) };
  }

  // What goes on a student's transcript, for the Platoon In-Charge once the results are out.
  @Get('transcripts/:student')
  @UseGuards(InstructorSignedIn)
  transcript(@Param('student') student: string, @CurrentInstructor() instructor: Instructor, @Res({ passthrough: true }) res: Response) {
    const number = /^\d$/.test(student) ? Number(student) : 0;
    if (number < 1 || number > students.length) throw new NotFoundException({ code: 'not_found' });
    res.set('Cache-Control', 'no-store');
    return this.transcripts.transcript(instructor, number);
  }

  // A picture or font a transcript is drawn with (its signature and stamp among them), on the same
  // terms. The browser keeps none of them.
  @Get('transcript-files/:name')
  @UseGuards(InstructorSignedIn)
  async transcriptFile(@Param('name') name: string, @CurrentInstructor() instructor: Instructor, @Res() res: Response) {
    if (!isTranscriptFile(name) || name === 'details.json') throw new NotFoundException({ code: 'not_found' });
    const file = await this.transcripts.file(instructor, name);
    res.set({ 'Content-Type': file.type, 'Cache-Control': 'no-store', 'Cross-Origin-Resource-Policy': 'same-site' });
    res.send(file.data);
  }
}
