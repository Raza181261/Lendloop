import { formatDate, timeAgo } from "@/lib/dates";

export type LoanView = {
  _id: string;
  toolName: string;
  borrowerName: string;
  lenderName: string;
  dueDate: number;
  status: "active" | "returned";
  overdue: boolean;
  lastReminderAt?: number;
};

export function LoanCard({
  loan,
  perspective,
  action,
}: {
  loan: LoanView;
  perspective: "borrower" | "lender";
  action?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="font-medium text-emerald-700">{loan.toolName}</p>
        <p className="text-xs text-stone-500">
          {perspective === "lender"
            ? `Borrower: ${loan.borrowerName}`
            : `Lender: ${loan.lenderName}`}
          {" · "}Due {formatDate(loan.dueDate)}
        </p>
        {/* Bonus: recent automation activity */}
        {loan.overdue && loan.lastReminderAt && (
          <p className="mt-1 text-xs text-sky-700">
            Reminder sent {timeAgo(loan.lastReminderAt)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {loan.status === "returned" ? (
          <span className="rounded-full bg-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700">
            Returned
          </span>
        ) : loan.overdue ? (
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
            Overdue
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
            On loan
          </span>
        )}
        {action}
      </div>
    </li>
  );
}
