// The signed-in pages' skeletons: soft grey blocks, pulsing, in the shape of what's coming, shown
// while the session and each tab's data load (the loading screen is only for the login page).

// One grey block, round-ended unless `className` gives it other corners. data-skeleton keeps it
// pulsing even under the loading screen (see globals.css).
export function Bar({ className = "" }) {
  const corners = /(^|\s)rounded-/.test(className) ? "" : "rounded-full";
  return <span data-skeleton aria-hidden="true" className={`block animate-pulse bg-ink/[0.07] ${corners} ${className}`} />;
}

// said to screen readers in place of the blocks
function Loading({ children, className }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

// a tab's count line, title and button
function Header({ title = "w-72 sm:w-[28rem]" }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
      <div>
        <Bar className="my-0.5 h-4 w-24" />
        <Bar className={`mt-3 h-12 rounded-2xl sm:h-14 ${title}`} />
      </div>
      <Bar className="h-12 w-40" />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <Loading className="space-y-12">
      <div>
        <Bar className="my-0.5 h-4 w-48" />
        <Bar className="mt-3 h-12 w-80 max-w-full rounded-2xl sm:h-14 sm:w-[30rem]" />
      </div>
      <div className="rounded-[28px] bg-white p-6 ring-1 ring-black/5 sm:p-8">
        <div className="flex items-center gap-4">
          <Bar className="size-14" />
          <div>
            <Bar className="h-3.5 w-24" />
            <Bar className="mt-2.5 h-5 w-40" />
          </div>
        </div>
        <div className="mt-8 grid gap-x-8 gap-y-5 border-t border-ink/10 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <Bar className="h-3 w-16" />
              <Bar className="mt-2.5 h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Bar className="h-4 w-24" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-[24px] bg-white p-2 ring-1 ring-black/5">
              <Bar className="aspect-[4/3] w-full rounded-[18px]" />
              <div className="px-3 pb-3 pt-4">
                <Bar className="h-4 w-28" />
                <Bar className="mt-2.5 h-3 w-40 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}

// A table (wider screens) or cards (phones) of grey rows. `columns` are the real table's column
// widths, and `bars` the width of the block in each; `fields` is how many lines each card has.
function TableSkeleton({ columns, bars, fields }) {
  const rows = [0, 1, 2];
  return (
    <>
      <div className="hidden rounded-[28px] bg-white ring-1 ring-black/5 lg:block">
        <table className="w-full table-fixed">
          <colgroup>
            {columns.map((width, i) => (
              <col key={i} className={width} />
            ))}
          </colgroup>
          <tbody>
            <tr>
              {bars.map((bar, i) => (
                <td key={i} className={`py-5 ${i === 0 ? "pl-6 pr-3" : "px-3"}`}>
                  {bar && <Bar className="h-3 w-12" />}
                </td>
              ))}
            </tr>
            {rows.map((row) => (
              <tr key={row} className="border-t border-ink/10">
                {bars.map((bar, i) => (
                  <td key={i} className={`py-4 ${i === 0 ? "pl-6 pr-3" : "px-3"}`}>
                    {bar && <Bar className={`h-4 ${bar}`} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 lg:hidden">
        {rows.slice(0, 2).map((row) => (
          <div key={row} className="rounded-[24px] bg-white p-5 ring-1 ring-black/5">
            <Bar className="my-1 h-5 w-40" />
            <div className="mt-3 space-y-4 border-t border-ink/10 pt-4">
              {Array.from({ length: fields }, (_, i) => (
                <div key={i} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3">
                  <Bar className="h-3 w-14" />
                  <Bar className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function UsersSkeleton() {
  return (
    <Loading className="space-y-10">
      <Header title="w-72 sm:w-[26rem]" />
      <TableSkeleton
        columns={["w-16", "", "w-[17%]", "w-[24%]", "w-[18%]", "w-28", "w-14"]}
        bars={["w-5", "w-3/4", "w-2/3", "w-4/5", "w-3/4", "w-14", null]}
        fields={4}
      />
    </Loading>
  );
}

export function FingerprintsSkeleton() {
  return (
    <Loading className="space-y-10">
      <Header title="w-80 sm:w-[32rem]" />
      <TableSkeleton columns={["w-[26%]", "", "w-32", "w-44", "w-14"]} bars={["w-3/4", "w-2/3", "w-20", "w-28", null]} fields={3} />
    </Loading>
  );
}

// the tree on the left (with rows at a few depths) and the details on the right
export function DirectorySkeleton() {
  const rows = [
    [0, "w-24"],
    [1, "w-40"],
    [2, "w-32"],
    [2, "w-36"],
    [1, "w-44"],
    [0, "w-36"],
    [1, "w-28"],
  ];
  return (
    <Loading className="space-y-10">
      <div>
        <Bar className="my-0.5 h-4 w-20" />
        <Bar className="mt-3 h-12 w-56 rounded-2xl sm:h-14 sm:w-72" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="rounded-[28px] bg-white p-3 ring-1 ring-black/5">
          <Bar className="mx-3 my-3.5 h-3.5 w-28" />
          <div className="space-y-0.5">
            {rows.map(([depth, width], i) => (
              <div key={i} className="flex items-center gap-2 py-2.5" style={{ paddingLeft: 12 + depth * 18 + 26 }}>
                <Bar className="size-[18px] rounded-md" />
                <Bar className={`h-3.5 ${width}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden rounded-[28px] bg-white p-8 ring-1 ring-black/5 lg:block">
          <Bar className="h-3.5 w-48" />
          <Bar className="mt-4 h-9 w-80 rounded-xl" />
          {[2, 4].map((lines, section) => (
            <div key={section} className="mt-8 border-t border-ink/10 pt-6">
              <Bar className="h-3.5 w-16" />
              <div className="mt-4 space-y-4">
                {Array.from({ length: lines }, (_, i) => (
                  <div key={i} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
                    <Bar className="h-3 w-14" />
                    <Bar className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}
