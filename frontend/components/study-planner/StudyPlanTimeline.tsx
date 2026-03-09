'use client';

type StudyPlanItem = {
  week: number;
  theme: string;
  topic: string;
  learning_objectives: string[];
  action_items: string[];
  resources: string[];
  milestone: string;
};

type StudyPlanTimelineProps = {
  planData: StudyPlanItem[];
  isLoading?: boolean;
  method?: string;
};

export default function StudyPlanTimeline({
  planData,
  isLoading = false,
  method,
}: StudyPlanTimelineProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Generating your study plan...</p>
      </div>
    );
  }

  if (!planData?.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">No plan has been generated yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          Generated {planData.length} week{planData.length === 1 ? '' : 's'}
          {method ? ` using ${method}` : ''}.
        </p>
      </div>

      {planData.map((item) => (
        <article
          key={`week-${item.week}-${item.topic}`}
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h3 className="text-lg font-semibold text-slate-900">
            Week {item.week}: {item.theme}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{item.topic}</p>

          <div className="mt-4 grid gap-3">
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Learning Objectives
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {item.learning_objectives?.map((objective, index) => (
                  <li key={`objective-${item.week}-${index}`}>{objective}</li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Action Items
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {item.action_items?.map((action, index) => (
                  <li key={`action-${item.week}-${index}`}>{action}</li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resources
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {item.resources?.map((resource, index) => (
                  <li key={`resource-${item.week}-${index}`}>{resource}</li>
                ))}
              </ul>
            </section>
          </div>

          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Milestone: {item.milestone}
          </p>
        </article>
      ))}
    </div>
  );
}
