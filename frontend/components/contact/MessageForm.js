"use client";

import { useState } from "react";
import CtaButton from "@/components/CtaButton";
import { generalEmail } from "@/components/contact-details";

const field =
  "mt-2 block w-full rounded-2xl bg-white px-4 py-3 text-[15px] text-ink ring-1 ring-ink/15 outline-none transition-shadow placeholder:text-ink/35 focus:ring-2 focus:ring-ink/40";

// A message to The Director's Office. There's no backend yet, so sending opens the visitor's own
// email app with the message filled in and addressed to the general enquiries inbox; nothing is
// stored on the site. When the backend exists this can post to it instead.
export default function MessageForm() {
  const [values, setValues] = useState({ name: "", email: "", subject: "", message: "" });
  const update = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    const body = `${values.message}\n\n${values.name}\n${values.email}`;
    window.location.href = `mailto:${generalEmail}?subject=${encodeURIComponent(values.subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-2">
      <label className="text-sm font-medium">
        Name
        <input required autoComplete="name" value={values.name} onChange={update("name")} className={field} />
      </label>
      <label className="text-sm font-medium">
        Email
        <input
          required
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={values.email}
          onChange={update("email")}
          className={field}
        />
      </label>
      <label className="text-sm font-medium md:col-span-2">
        Subject
        <input required value={values.subject} onChange={update("subject")} className={field} />
      </label>
      <label className="text-sm font-medium md:col-span-2">
        Message
        <textarea required rows={7} value={values.message} onChange={update("message")} className={`${field} resize-y`} />
      </label>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:col-span-2">
        <CtaButton label="Send message" />
        <p className="text-sm text-ink/50">Opens your email app, addressed to {generalEmail}.</p>
      </div>
    </form>
  );
}
