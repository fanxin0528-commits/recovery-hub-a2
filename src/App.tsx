import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { EmptyState, ListItem, Panel, PixelButton, Row, Tag } from './components/UI';
import { PixelIcon, type PixelIconName } from './components/PixelIcon';
import { apiGet, apiSend, numberValue, valueText } from './lib/api';
import type { AnyRecord, ContextPayload, DetailPayload, ExplorePayload, HomePayload, StagePayload } from './types';

type Route = {
  path: string;
  label: string;
  icon: PixelIconName;
};

const navRoutes: Route[] = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/stage', label: 'Stage', icon: 'stage' },
  { path: '/explore', label: 'Explore', icon: 'explore' },
  { path: '/log/new', label: 'Log', icon: 'log' },
  { path: '/account', label: 'Account', icon: 'account' },
];

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState(null, '', to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return { path, navigate };
}

function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    apiGet<T>(path)
      .then((payload) => {
        setData(payload);
        setError('');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    apiGet<T>(path)
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setError('');
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return { data, error, loading, reload, setData };
}

function AppShell({ children, path, navigate }: { children: React.ReactNode; path: string; navigate: (to: string) => void }) {
  const activePath = path.startsWith('/detail') ? '/explore' : path;
  return (
    <div className="app-shell">
      <header className="top-nav">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }}>
          <span className="brand-tile"><PixelIcon name="heart" size={30} /></span>
          <span>Recovery Hub</span>
        </a>
        <nav className="desktop-tabs" aria-label="Primary">
          {navRoutes.map((route) => (
            <a
              key={route.path}
              className={`nav-button ${activePath === route.path ? 'active' : ''}`}
              href={route.path}
              onClick={(event) => { event.preventDefault(); navigate(route.path); }}
            >
              <PixelIcon name={route.icon} size={18} light={activePath === route.path} />
              <span>{route.label}</span>
            </a>
          ))}
        </nav>
        <div className="fx-badge"><PixelIcon name="gear" size={18} /> FX</div>
      </header>
      <main>{children}</main>
      <nav className="mobile-bottom-nav" aria-label="Mobile primary">
        {navRoutes.filter((route) => route.path !== '/stage').map((route) => (
          <a
            key={route.path}
            className={`mobile-nav-button ${activePath === route.path ? 'active' : ''}`}
            href={route.path}
            onClick={(event) => { event.preventDefault(); navigate(route.path); }}
          >
            <PixelIcon name={route.icon} size={16} light={activePath === route.path} />
            <span>{route.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

function PageHeader({ icon, title, subtitle }: { icon: PixelIconName; title: string; subtitle: string }) {
  return (
    <div className="page-title">
      <span className="page-icon"><PixelIcon name={icon} size={30} /></span>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function Status({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <div className="status-line">Loading recovery state...</div>;
  if (error) return <div className="status-line error">{error}</div>;
  return null;
}

function HomePage({ navigate }: { navigate: (to: string) => void }) {
  const { data, loading, error } = useApi<HomePayload>('/api/home');
  const context = data?.context ?? {};
  const latest = data?.latestPainState ?? {};

  return (
    <section className="screen desktop-screen">
      <PageHeader icon="home" title="Hub Home" subtitle="A calm entry view for current state, next action, and recent relevance." />
      <Status loading={loading} error={error} />
      {data ? (
        <div className="home-grid">
          <Panel title="Current Context" icon="body" className="span-wide">
            <h2>{valueText(context.body_area)} - {valueText(context.recovery_stage)}</h2>
            <p>Goal: {valueText(context.activity_goal)}. Latest pain comes from the most recent structured log.</p>
            <div className="row-pair">
              <Row label="Latest pain after" value={`${valueText(latest.pain_after, 'N/A')} / 10`} />
              <Row label="Confidence" value={valueText(latest.confidence_level)} />
            </div>
            <div className="tag-row">
              <Tag icon="body">{valueText(context.body_area)}</Tag>
              <Tag icon="stage">{valueText(context.recovery_stage)}</Tag>
              <Tag icon="movement">{valueText(context.activity_goal)}</Tag>
            </div>
          </Panel>

          <Panel
            title="Continue Logging"
            icon="log"
            edgeAction={<PixelButton icon="log" onClick={() => navigate('/log/new')}>Add recovery log</PixelButton>}
          >
            <p>A short log keeps recovery state current without editing account fields.</p>
          </Panel>

          <Panel title="Latest Pain State" icon="pain">
            <Row label="Source" value="Latest log" />
            <Row label="Pain before" value={`${valueText(latest.pain_before, 'N/A')} / 10`} />
            <Row label="Pain after" value={`${valueText(latest.pain_after, 'N/A')} / 10`} />
            <Row label="Updated" value={valueText(latest.log_date)} />
          </Panel>

          <Panel title="Recently Relevant" icon="goal" className="span-wide">
            {(data.recommendedLogs.length || data.recommendedThreads.length) ? (
              <>
                {data.recommendedLogs.slice(0, 2).map((item) => (
                  <ListItem key={`log-${item.recovery_log_id}`} icon="log" title={valueText(item.title)} meta="same stage, body area, and goal" href={`/detail/log/${item.recovery_log_id}`} />
                ))}
                {data.recommendedThreads.slice(0, 2).map((item) => (
                  <ListItem key={`thread-${item.discussion_thread_id}`} icon="question" title={valueText(item.title)} meta="controlled return discussion" href={`/detail/thread/${item.discussion_thread_id}`} />
                ))}
              </>
            ) : <EmptyState>No matching recovery stories yet.</EmptyState>}
          </Panel>

          <Panel title="Review Stage Guidance" icon="stage" edgeAction={<PixelButton icon="stage" onClick={() => navigate('/stage')}>Open stage</PixelButton>}>
            <p>{valueText(context.stage_guidance, 'Controlled Return focuses on low-load testing and symptom response.')}</p>
          </Panel>

          <Panel
            title="Account Summary"
            icon="account"
            edgeAction={<PixelButton icon="account" variant="secondary" onClick={() => navigate('/account')}>View account</PixelButton>}
          >
            <p>Account shows the same read-only pain state and preferences.</p>
          </Panel>

          <Panel
            title="Saved For Later"
            icon="saved"
            edgeAction={<PixelButton icon="saved" variant="secondary" onClick={() => navigate('/account')}>Open saved</PixelButton>}
          >
            <p>{data.savedItems.length} items saved from similar-stage recovery stories.</p>
          </Panel>

          <Panel title="What Home Does Not Do" icon="home">
            <p>It does not ask users to browse similar people first. That belongs in Explore.</p>
            <Tag icon="home">Focused home</Tag>
          </Panel>

          <Panel
            title="Need Similar People?"
            icon="similar"
            edgeAction={<PixelButton icon="explore" onClick={() => navigate('/explore')}>Open Explore</PixelButton>}
          >
            <p>Use Explore filters for stage, body area, goal, and tags.</p>
          </Panel>
        </div>
      ) : null}
    </section>
  );
}

function ContextPage() {
  const { data, loading, error, reload } = useApi<ContextPayload>('/api/context');
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  const [saved, setSaved] = useState('');
  const defaults = useMemo(() => ({
    body_area_id: numberValue(data?.context?.body_area_id, 1),
    recovery_stage_id: numberValue(data?.context?.recovery_stage_id, 2),
    activity_goal_id: numberValue(data?.context?.activity_goal_id, 1),
    experience_level: valueText(data?.context?.experience_level, 'recreational'),
    current_limitation: valueText(data?.context?.current_limitation, ''),
    personalize_recommendations: numberValue(data?.context?.personalize_recommendations, 1) === 1,
    share_stage_tags: numberValue(data?.context?.share_stage_tags, 1) === 1,
    allow_optional_tracking: numberValue(data?.context?.allow_optional_tracking, 0) === 1,
  }), [data]);

  const setValue = (key: string, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    await apiSend('/api/context', 'PUT', { ...defaults, ...form });
    setSaved('Context saved. Pain level remains sourced from logs.');
    reload();
  };

  return (
    <section className="screen desktop-screen">
      <PageHeader icon="body" title="Recovery Context Setup" subtitle="Set relevance for recommendations. No signup and no manual pain input." />
      <Status loading={loading} error={error} />
      {data ? (
        <div className="three-grid">
          <Panel title="Recovery Context" icon="body" className="span-wide" edgeAction={<PixelButton icon="body" onClick={save}>Save context</PixelButton>}>
            <div className="form-grid">
              <Select label="Body area" value={form.body_area_id ?? defaults.body_area_id} options={data.options.bodyAreas} valueKey="body_area_id" onChange={(value) => setValue('body_area_id', value)} />
              <Select label="Stage" value={form.recovery_stage_id ?? defaults.recovery_stage_id} options={data.options.recoveryStages} valueKey="recovery_stage_id" onChange={(value) => setValue('recovery_stage_id', value)} />
              <Select label="Goal" value={form.activity_goal_id ?? defaults.activity_goal_id} options={data.options.activityGoals} valueKey="activity_goal_id" onChange={(value) => setValue('activity_goal_id', value)} />
              <Select label="Experience" value={form.experience_level ?? defaults.experience_level} options={[{ name: 'beginner' }, { name: 'recreational' }, { name: 'competitive' }, { name: 'unknown' }]} valueKey="name" onChange={(value) => setValue('experience_level', value)} />
            </div>
            <label className="field full-field">
              <span>Current limitation</span>
              <textarea value={String(form.current_limitation ?? defaults.current_limitation)} onChange={(event) => setValue('current_limitation', event.target.value)} />
            </label>
            {saved ? <p className="success-text">{saved}</p> : null}
          </Panel>

          <Panel title="Preferences" icon="consent">
            <Toggle label="Recommendations" checked={Boolean(form.personalize_recommendations ?? defaults.personalize_recommendations)} onChange={(value) => setValue('personalize_recommendations', value)} />
            <Toggle label="Share stage tags" checked={Boolean(form.share_stage_tags ?? defaults.share_stage_tags)} onChange={(value) => setValue('share_stage_tags', value)} />
            <Toggle label="Optional tracking" checked={Boolean(form.allow_optional_tracking ?? defaults.allow_optional_tracking)} onChange={(value) => setValue('allow_optional_tracking', value)} />
          </Panel>

          <Panel title="Removed Field" icon="pain">
            <h2>No pain slider</h2>
            <p>Pain level appears from structured logs, not from Account or context setup.</p>
            <Tag icon="log">Logs source</Tag>
          </Panel>

          <Panel title="Consent Handling" icon="consent">
            <p>Cookie and tracking consent appears as a system-level prompt when needed.</p>
          </Panel>

          <Panel title="Data Mapping" icon="log">
            <Row label="Context" value="user_contexts" />
            <Row label="Pain" value="recovery_logs" />
            <Row label="Options" value="stage/body/goal" />
          </Panel>
        </div>
      ) : null}
    </section>
  );
}

function StagePage({ navigate }: { navigate: (to: string) => void }) {
  const { data, loading, error } = useApi<StagePayload>('/api/stage-dashboard');
  return (
    <section className="screen desktop-screen">
      <PageHeader icon="stage" title="Stage Dashboard" subtitle="Stage guidance and matched examples for controlled return." />
      <Status loading={loading} error={error} />
      {data ? (
        <div className="three-grid">
          <Panel title={valueText(data.stage.name, 'Controlled Return').toUpperCase()} icon="stage" className="span-wide">
            <h2>Test and observe response</h2>
            <p>{valueText(data.stage.guidance)}</p>
            <div className="tag-row">
              <Tag icon="pain">{valueText(data.stage.intensity_level, 'low')}</Tag>
              <Tag icon="movement">{valueText(data.context.activity_goal)}</Tag>
            </div>
          </Panel>
          <Panel title="Open Questions" icon="question" edgeAction={<PixelButton icon="question" onClick={() => navigate('/detail/thread/2')}>Open question</PixelButton>}>
            {data.discussions.slice(0, 2).map((item) => (
              <ListItem key={item.discussion_thread_id} icon="question" title={valueText(item.title)} meta={`${valueText(item.status)} thread`} href={`/detail/thread/${item.discussion_thread_id}`} />
            ))}
          </Panel>
          <Panel title="Stage State" icon="pain">
            <Row label="Stage" value={valueText(data.context.recovery_stage)} />
            <Row label="Intensity" value={valueText(data.stage.intensity_level)} />
            <Row label="Goal" value={valueText(data.context.activity_goal)} />
          </Panel>
          <Panel title="Similar-Stage Logs" icon="log" className="span-wide">
            {data.logs.slice(0, 3).map((item) => (
              <ListItem key={item.recovery_log_id} icon="log" title={valueText(item.title)} meta={`pain after ${valueText(item.pain_after)} / 10`} href={`/detail/log/${item.recovery_log_id}`} />
            ))}
          </Panel>
          <Panel title="Movement Ideas" icon="movement">
            {data.movementIdeas.map((idea) => <ListItem key={idea} icon="movement" title={idea} />)}
          </Panel>
          <Panel title="Need More Matches?" icon="explore" edgeAction={<PixelButton icon="explore" onClick={() => navigate('/explore')}>Open Explore</PixelButton>}>
            <p>Use Explore filters for similar people, logs, discussions, and tags.</p>
          </Panel>
        </div>
      ) : null}
    </section>
  );
}

function StructuredLogPage({ navigate }: { navigate: (to: string) => void }) {
  const { data } = useApi<ContextPayload>('/api/context');
  const [form, setForm] = useState({
    title: 'Recovery check-in',
    movement_tried: 'Eight minute walk and step-down practice.',
    symptoms_and_limits: 'No swelling increase.',
    what_helped: 'Stopping early kept pain stable.',
    question_for_community: 'Should I repeat this tomorrow?',
    pain_before: 1,
    pain_after: 2,
    confidence_level: 'medium',
    visibility: 'members',
    tag_ids: [1, 2],
  });
  const [result, setResult] = useState('');

  const update = (key: string, value: string | number | number[]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    const context = data?.context ?? {};
    const response = await apiSend<{ logId: number }>('/api/logs', 'POST', {
      ...form,
      body_area_id: context.body_area_id ?? 1,
      recovery_stage_id: context.recovery_stage_id ?? 2,
      activity_goal_id: context.activity_goal_id ?? 1,
    });
    setResult(`Saved log #${response.logId}. Home and Account now read latest pain from this log.`);
  };

  return (
    <section className="screen desktop-screen">
      <PageHeader icon="log" title="Structured Recovery Log" subtitle="Pain before and after are recorded here, then used as latest state." />
      <div className="three-grid">
        <Panel title="Movement Tried" icon="movement" className="span-wide">
          <label className="field"><span>Title</span><input value={form.title} onChange={(event) => update('title', event.target.value)} /></label>
          <label className="field"><span>Movement tried</span><textarea value={form.movement_tried} onChange={(event) => update('movement_tried', event.target.value)} /></label>
          <label className="field"><span>Symptoms / limits</span><textarea value={form.symptoms_and_limits} onChange={(event) => update('symptoms_and_limits', event.target.value)} /></label>
        </Panel>
        <Panel title="Pain Source" icon="pain" edgeAction={<PixelButton icon="log" onClick={submit}>Save recovery log</PixelButton>}>
          <div className="form-grid compact">
            <label className="field"><span>Pain before</span><input type="number" min="0" max="10" value={form.pain_before} onChange={(event) => update('pain_before', Number(event.target.value))} /></label>
            <label className="field"><span>Pain after</span><input type="number" min="0" max="10" value={form.pain_after} onChange={(event) => update('pain_after', Number(event.target.value))} /></label>
          </div>
          <Select label="Confidence" value={form.confidence_level} options={[{ name: 'low' }, { name: 'medium' }, { name: 'high' }]} valueKey="name" onChange={(value) => update('confidence_level', value)} />
          {result ? <p className="success-text">{result}</p> : null}
        </Panel>
        <Panel title="Sharing" icon="consent">
          <Select label="Visibility" value={form.visibility} options={[{ name: 'private' }, { name: 'members' }, { name: 'public' }]} valueKey="name" onChange={(value) => update('visibility', value)} />
          <div className="tag-row">
            <Tag icon="stage">stage 2</Tag>
            <Tag icon="movement">low intensity</Tag>
          </div>
        </Panel>
        <Panel title="Community Question" icon="question" className="span-wide">
          <label className="field"><span>What helped?</span><textarea value={form.what_helped} onChange={(event) => update('what_helped', event.target.value)} /></label>
          <label className="field"><span>Question for community</span><textarea value={form.question_for_community} onChange={(event) => update('question_for_community', event.target.value)} /></label>
        </Panel>
        <Panel title="After Submit" icon="account">
          <p>Home and Account latest pain state update from the newest recovery log.</p>
        </Panel>
        <Panel title="Database Mapping" icon="log" edgeAction={<PixelButton icon="home" variant="secondary" onClick={() => navigate('/')}>View Home</PixelButton>}>
          <p>Creates `recovery_logs` and optional `recovery_log_tags` rows.</p>
        </Panel>
      </div>
    </section>
  );
}

function DetailPage({ path, navigate }: { path: string; navigate: (to: string) => void }) {
  const [, , type = 'thread', id = '1'] = path.split('/');
  const { data, loading, error, reload } = useApi<DetailPayload>(`/api/detail/${type}/${id}`);
  const [reply, setReply] = useState('I had a similar response and found it helped to stop early.');
  const item = data?.item ?? {};
  const isLog = data?.type === 'log';

  const save = async () => {
    await apiSend('/api/saved-items', 'POST', isLog ? { recovery_log_id: item.recovery_log_id } : { discussion_thread_id: item.discussion_thread_id });
    reload();
  };
  const report = async () => {
    await apiSend('/api/content-reports', 'POST', isLog ? { recovery_log_id: item.recovery_log_id, reason: 'other' } : { discussion_thread_id: item.discussion_thread_id, reason: 'other' });
  };
  const sendReply = async () => {
    await apiSend('/api/discussion-replies', 'POST', { discussion_thread_id: item.discussion_thread_id, reply_body: reply });
    setReply('');
    reload();
  };

  return (
    <section className="screen desktop-screen">
      <PageHeader icon={isLog ? 'log' : 'question'} title="Log / Discussion Detail" subtitle="Context tags, replies, save/report, and similar-stage prompts." />
      <Status loading={loading} error={error} />
      {data ? (
        <div className="three-grid">
          <Panel title={isLog ? 'Recovery Log' : 'Discussion'} icon={isLog ? 'log' : 'question'} className="span-wide">
            <h2>{valueText(item.title)}</h2>
            <p>{isLog ? valueText(item.movement_tried) : valueText(item.question_body)}</p>
            {isLog ? (
              <>
                <Row label="Pain before" value={`${valueText(item.pain_before)} / 10`} />
                <Row label="Pain after" value={`${valueText(item.pain_after)} / 10`} />
              </>
            ) : <Row label="Status" value={valueText(item.status)} />}
            <div className="tag-row">
              <Tag icon="body">{valueText(item.body_area)}</Tag>
              <Tag icon="stage">{valueText(item.recovery_stage)}</Tag>
              {data.tags.map((tag) => <Tag key={tag.log_tag_id} icon="goal">{valueText(tag.name)}</Tag>)}
            </div>
          </Panel>
          <Panel title="Context" icon="similar">
            <Row label="Author" value={valueText(item.author)} />
            <Row label="Goal" value={valueText(item.activity_goal)} />
            <Row label="Created" value={valueText(item.created_at)} />
          </Panel>
          <Panel title="Actions" icon="saved" edgeAction={<PixelButton icon="explore" onClick={() => navigate('/explore')}>Back to Explore</PixelButton>}>
            <PixelButton icon="saved" variant="secondary" onClick={save}>Save</PixelButton>
            <PixelButton icon="report" variant="secondary" onClick={report}>Report</PixelButton>
          </Panel>
          <Panel title="Community Replies" icon="reply" className="span-wide">
            {data.replies.length ? data.replies.map((replyItem) => (
              <ListItem key={replyItem.discussion_reply_id} icon="reply" title={valueText(replyItem.reply_body)} meta={`from ${valueText(replyItem.author)}`} />
            )) : <EmptyState>Logs do not have discussion replies in the current schema.</EmptyState>}
          </Panel>
          {!isLog ? (
            <Panel title="Reply Composer" icon="reply" edgeAction={<PixelButton icon="reply" onClick={sendReply}>Send reply</PixelButton>}>
              <label className="field"><span>Reply</span><textarea value={reply} onChange={(event) => setReply(event.target.value)} /></label>
            </Panel>
          ) : (
            <Panel title="Similar Stage Prompt" icon="stage">
              <p>Use Explore to compare this log with people in the same body area, goal, and stage.</p>
            </Panel>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ExplorePage() {
  const [query, setQuery] = useState({ stageId: '', bodyAreaId: '', goalId: '', tag: '', q: '' });
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => { if (value) params.set(key, value); });
    return params.toString();
  }, [query]);
  const { data, loading, error } = useApi<ExplorePayload>(`/api/explore${queryString ? `?${queryString}` : ''}`);
  const setFilter = (key: keyof typeof query, value: string) => setQuery((current) => ({ ...current, [key]: value }));

  return (
    <section className="screen desktop-screen">
      <PageHeader icon="explore" title="Explore Community" subtitle="Find people recovering at your stage through filters, logs, and discussions." />
      <Status loading={loading} error={error} />
      {data ? (
        <div className="three-grid">
          <Panel title="Find People" icon="similar" className="span-wide">
            <p>Discovery lives here, not on Home. Filter for stage, body area, goal, tags, and search text.</p>
            <div className="form-grid">
              <Select label="Stage" value={query.stageId} options={data.options.recoveryStages} valueKey="recovery_stage_id" empty="Any stage" onChange={(value) => setFilter('stageId', String(value))} />
              <Select label="Body area" value={query.bodyAreaId} options={data.options.bodyAreas} valueKey="body_area_id" empty="Any body area" onChange={(value) => setFilter('bodyAreaId', String(value))} />
              <Select label="Goal" value={query.goalId} options={data.options.activityGoals} valueKey="activity_goal_id" empty="Any goal" onChange={(value) => setFilter('goalId', String(value))} />
              <Select label="Tag" value={query.tag} options={data.options.tags} valueKey="log_tag_id" empty="Any log tag" onChange={(value) => setFilter('tag', String(value))} />
            </div>
            <label className="field full-field"><span>Search text</span><input value={query.q} onChange={(event) => setFilter('q', event.target.value)} placeholder="stairs, walking, confidence" /></label>
            <p className="hint">{data.note}</p>
          </Panel>
          <Panel title="Similar People" icon="similar">
            {data.similarPeople.length ? data.similarPeople.map((person) => (
              <ListItem key={person.user_id} icon="account" title={valueText(person.display_name)} meta={`${valueText(person.recovery_stage)} / ${valueText(person.body_area)}`} />
            )) : <EmptyState>No people match these filters yet.</EmptyState>}
          </Panel>
          <Panel title="Recovery Logs" icon="log" className="span-wide">
            {data.logs.length ? data.logs.map((item) => (
              <ListItem key={item.recovery_log_id} icon="log" title={valueText(item.title)} meta={`${valueText(item.author)} - pain after ${valueText(item.pain_after)} / 10`} href={`/detail/log/${item.recovery_log_id}`} />
            )) : <EmptyState>No logs match these filters.</EmptyState>}
          </Panel>
          <Panel title="Discussions" icon="question">
            {data.discussions.length ? data.discussions.map((item) => (
              <ListItem key={item.discussion_thread_id} icon="question" title={valueText(item.title)} meta={`${valueText(item.status)} / ${valueText(item.author)}`} href={`/detail/thread/${item.discussion_thread_id}`} />
            )) : <EmptyState>No discussions match these filters.</EmptyState>}
          </Panel>
          <Panel title="Why Not Home?" icon="home">
            <p>Home stays focused on current recovery state. Explore owns discovery and comparison.</p>
          </Panel>
        </div>
      ) : null}
    </section>
  );
}

function AccountPage() {
  const { data, loading, error } = useApi<HomePayload>('/api/home');
  const context = data?.context ?? {};
  const latest = data?.latestPainState ?? {};
  return (
    <section className="screen desktop-screen">
      <PageHeader icon="account" title="My Account / Context Summary" subtitle="Read-only recovery state, preferences, and saved content." />
      <Status loading={loading} error={error} />
      {data ? (
        <div className="three-grid">
          <Panel title="Profile" icon="account">
            <h2>{data.currentUser.displayName}</h2>
            <p>Logged-in member session. No guest session and no signup page in this hub.</p>
          </Panel>
          <Panel title="Recovery Context" icon="body" className="span-wide">
            <Row label="Body area" value={valueText(context.body_area)} />
            <Row label="Stage" value={valueText(context.recovery_stage)} />
            <Row label="Goal" value={valueText(context.activity_goal)} />
            <Row label="Limitation" value={valueText(context.current_limitation)} />
          </Panel>
          <Panel title="Latest Pain From Logs" icon="pain">
            <Row label="Source" value="Latest recovery log" />
            <Row label="Pain before" value={`${valueText(latest.pain_before)} / 10`} />
            <Row label="Pain after" value={`${valueText(latest.pain_after)} / 10`} />
            <Row label="Date" value={valueText(latest.log_date)} />
          </Panel>
          <Panel title="Saved Items" icon="saved" className="span-wide">
            {data.savedItems.length ? data.savedItems.map((item) => (
              <ListItem key={item.saved_item_id} icon={item.type === 'log' ? 'log' : 'question'} title={valueText(item.title)} meta={valueText(item.type)} />
            )) : <EmptyState>No saved items yet.</EmptyState>}
          </Panel>
          <Panel title="Preferences" icon="consent">
            <Row label="Recommendations" value={numberValue(context.personalize_recommendations, 1) ? 'On' : 'Off'} />
            <Row label="Share stage tags" value={numberValue(context.share_stage_tags, 1) ? 'On' : 'Off'} />
            <Row label="Optional tracking" value={numberValue(context.allow_optional_tracking, 0) ? 'On' : 'Off'} />
          </Panel>
          <Panel title="No Pain Edit" icon="report">
            <p>Account displays recovery state but does not maintain duplicate pain values.</p>
            <Tag icon="log">Latest log source</Tag>
          </Panel>
        </div>
      ) : null}
    </section>
  );
}

function Select({ label, value, options, valueKey, onChange, empty }: {
  label: string;
  value: unknown;
  options: AnyRecord[];
  valueKey: string;
  onChange: (value: string | number) => void;
  empty?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
        {empty ? <option value="">{empty}</option> : null}
        {options.map((option) => (
          <option key={String(option[valueKey] ?? option.name)} value={String(option[valueKey] ?? option.name)}>
            {valueText(option.name)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <strong>{checked ? 'On' : 'Off'}</strong>
    </label>
  );
}

export default function App() {
  const { path, navigate } = useRoute();
  let page = <HomePage navigate={navigate} />;
  if (path === '/context') page = <ContextPage />;
  if (path === '/stage') page = <StagePage navigate={navigate} />;
  if (path === '/log/new') page = <StructuredLogPage navigate={navigate} />;
  if (path.startsWith('/detail/')) page = <DetailPage path={path} navigate={navigate} />;
  if (path === '/explore') page = <ExplorePage />;
  if (path === '/account') page = <AccountPage />;

  return <AppShell path={path} navigate={navigate}>{page}</AppShell>;
}
