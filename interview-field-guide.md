# Interview Field Guide - my voice, my stories

Scripts for the interview loop, written the way I actually talk, built from
work I actually did. Companion to `my-voice.md`. Private working doc - not
linked anywhere, not in the sitemap, not published. Keep it that way (an
interviewer finding my answer key would be a bad day).

Target: Staff / Principal Product Manager, AI-native. Senior PM now, talking
a level up.

---

## How to use this

Each question has two parts:

- **Say it** - the lines, in my voice. ~90% of what I'd actually say.
- **Beats** - the spine underneath, so I can adapt and never sound memorized.

Learn the beats. Keep the closers. Don't recite.

### The four-check, out loud

Same gut test as the writing, said instead of typed:

1. **Specific** - one real object per answer. A number, a call, a name.
   "44 to 70." "A property manager drowning in applicants." Concrete reads
   as experience.
2. **Plain** - no buzzwords in the room either. If a smart friend outside
   tech would need a gloss, cut it.
3. **A little dry** - one offhand honest line beats a polished pitch.
   Invoke the data-guy, then admit where he fails. That move reads as
   senior, not unsure.
4. **Land hard and stop** - close on a short true line and let the silence
   sit. Resist the qualifier after the punch. Let them ask the follow-up.

### The staff bar, in one line

Junior answers the question. Senior solves the problem. Staff reframes
whether it's the right problem - and brings the room along.

Three reflexes that read as staff, drop them on purpose:

- **Scope before you solve.** Name the user, the goal, the constraint
  before diving. "Let me set it up before I solve it."
- **Connect to the business.** Tie the feature to a number someone in the
  room owns. Money, retention, risk.
- **Raise the floor.** Talk about changing how the team works, not just
  what you shipped. That's the cleanest staff tell I've got.

---

## 1. The opener and your motivation

### "Tell me about yourself."

*Testing: can you tell a clean story with a through-line, and do you know
what you're for? They half-decide in 90 seconds.*

**Say it:**

> I'm a PM who came up through data. Started as a data scientist at Oracle,
> then Lively, and somewhere in the migration pipelines and the ledgers I
> realized I cared more about what we were building than the model under it.
> So I moved to product.
>
> The through-line is the same everywhere I've been: money and data moving
> between parties who don't fully trust each other, where being wrong is
> expensive. At Lively I moved $50M in HSA assets across banks with zero
> data loss. At AppFolio I own rental applications and payments, about $40M
> a year, where the person who pays and the person who uses it are different
> people and the product has to serve both.
>
> The newer thread is AI. I build with it at work, and at home I run my
> family's calendar on an open-source assistant I wrote. The part I actually
> like is the unglamorous part - the evals, the guardrails, the work that
> makes it safe to ship.
>
> That's me. Quant who became a builder.

**Beats:** started in data → the turn (cared about the thing, not the model)
→ the through-line (money + data + trust, expensive to be wrong) → the AI
thread → one-line who-I-am closer.

**If they push** ("why leave data science?"): the model was a tenth of the
impact. The other nine tenths was choosing what to build and getting people
to build it. I wanted the nine tenths.

**Avoid:** reading the resume top to bottom. They have it. Give them the
spine, not the timeline.

> Staff move: the through-line. Naming the pattern across roles, not listing
> jobs. I have a thesis, not a work history.

### "Why product management?"

**Say it:**

> Data science taught me to be right. Product taught me that being right is
> maybe a fifth of the job. The rest is choosing the problem worth solving
> and getting a room of people to go solve it.
>
> I like the whole arc of that. The customer call, the spec, the tradeoff
> nobody wants to make, the thing finally shipping. I'm not happy until it
> ships.

**Beats:** what data gave me (rigor) → what it didn't (the choice, the
people) → what I actually love (the whole arc, ending on ship).

### "Why us? Why this role?" (fill in the blank)

*Testing: did you do the work, and is the reason real. Generic enthusiasm
reads as junior.*

**Say it** (swap the specifics):

> Three reasons, and I'll be honest about all three.
>
> One, the problem. [Their problem] is the kind I've spent my career on -
> [tie to money movement / trust / a regulated workflow / AI in a real
> business]. I've shipped a version of it before.
>
> Two, the stage. You're at the point where [specific: you're putting AI
> into a workflow people actually depend on / going from one bet to a
> portfolio], and that's the work I'm best at.
>
> Three, selfishly - I'd learn from [specific person, team, or hard
> problem]. I'm not done getting better.

**Beats:** the problem (tie to real history) → the stage and timing → the
honest selfish reason. Always name one thing only true of them.

**Prep ritual:** never walk in without three only-true-of-them facts. One
product detail, one strategic bet, one thing I'd personally learn here.

### "Why are you leaving AppFolio? Why now?"

*Testing: running toward or away. Senior PMs run toward.*

**Say it:**

> Nothing's on fire. I'm proud of the application line - took submission
> from 44 to 70 and rebuilt it end to end. That chapter is mostly written.
>
> What's pulling me is scope. I want a bigger surface and harder AI problems
> than I can get where I am. I'd rather leave something good on a high note
> than stay until I'm coasting.

**Beats:** defuse (no drama) → the proud thing (a number) → the pull (scope,
not escape) → land on intent.

**Avoid:** badmouthing, ever. They hear how I'll talk about them someday.

### "What's your superpower?"

**Say it:**

> I turn fuzzy into testable. Hand me "make applications better" and I come
> back with a jobs-to-be-done map built from a hundred customer calls and a
> spec we can pressure-test before anyone writes code. A quant who can sit
> with a customer.
>
> The flip side, since you'll ask - I have to actively resist
> over-validating. Sometimes the right answer is just ship it and watch.

**Beats:** one real strength (fuzzy → testable, with proof) → the honest
flip side. Volunteering the weakness is the strength signal.

---

## 2. Product sense and design

### "Design a [product] for [user]."

*Testing: structured thinking, real user empathy, the nerve to prioritize.
Not creativity for its own sake.*

**Say it** (the frame, out loud):

> Let me set it up before I solve it. I'd rather get the user and the goal
> right, then narrow hard and go deep on one thing than spray twenty
> features.
>
> So - who's the user, and what one job are they hiring this for? I'll pick
> the user I find most interesting, [X], and the moment that matters most
> for them, [Y].
>
> Here's my model of that moment. [Walk the journey. Name the pain.] The
> sharpest pain is [Z], so that's what the product centers on. Here's the
> core flow.
>
> If I had to cut everything but one feature, I'd keep [the one]. That's the
> bet.

**Beats:** scope out loud (don't dive) → pick a user, a job, a moment → walk
the journey, find the sharpest pain → narrow to one core flow → name the one
thing you'd keep → the metric you'd watch.

**If they push** ("what about [other user]?"): real fork - here's the
tradeoff, and here's why I'd still start where I started.

> Staff move: narrowing. Juniors list features. "If I could keep one thing"
> is the line that separates levels.

### "Favorite product? How would you improve it?"

**Say it:**

> I'll pick something unglamorous. I love a tool that does one thing and
> respects my time - no account, no upsell, state lives in the URL. I build
> my own tools that way, so I'm biased.
>
> One improvement, tied to a real moment of friction: [the friction] →
> [the fix] → [who it helps and how I'd know it worked].

**Beats:** pick something specific, a little surprising → why, in terms of a
job it does for me → ONE improvement, anchored to a concrete friction, with
a success signal. Depth on one beats five shallow ideas.

---

## 3. Strategy

### "How would you grow [product]?"

*Testing: do you think in systems and bets, or features. Staff PMs connect
product to the business.*

**Say it:**

> Before I throw out ideas, I want to name the goal, because "grow" is three
> different businesses. More customers, more value per customer, or better
> retention of the ones we have? They point at different roadmaps. Let me
> assume [X] and say why.
>
> Then I'd find the leak. Growth usually isn't a new feature, it's a tax
> somewhere in the funnel you already have. At AppFolio the biggest win
> wasn't a new product - it was that applications only finished 44% of the
> time. Fix that leak and you've grown without building anything new.
>
> So my first move is diagnostic, not creative. Find the biggest leak, size
> it, fix it. Then bet on new surface.

**Beats:** define which growth (new / deeper / retained) → find the leak
before inventing features → size it → fix-the-leak before build-new → end on
sequencing.

> Staff move: refusing the premise that growth equals new features. "It's a
> tax in the funnel you already have," plus the 44-to-70 proof, is
> level-defining.

### "Should [company] build [X]?" (build / buy / partner)

**Say it:**

> Three questions, fast. Is it core to why customers pick us? Is it
> something only we can do well? And what does being wrong cost?
>
> Core and differentiating, build it. Table stakes but not our edge, buy or
> partner and put our people on the thing only we can do. I've lived both -
> we launched a Zillow integration to pre-fill applications rather than
> build that ourselves, and I've lived the part where you unwind a
> partnership when it stops serving the customer. Both are PM calls, not
> just BD.

**Beats:** three filters (core? only-us? cost of wrong?) → build the
differentiating, buy/partner the table stakes → ground in the Zillow
partnership and its wind-down.

### "Where would you take AI in this product over three years?"

*The staff vision question. Commit to a direction, not a feature list.*

**Say it:**

> Three-year detail is mostly wrong, so I'd commit to a direction and a
> sequence instead of a feature list.
>
> Year one, AI does the boring, verifiable work inside the existing flow -
> where being wrong is cheap and checkable. That's how you earn trust and
> build the eval muscle. Year two, once the evals are real, it does judgment
> work with a human on the hook. Year three, where it's earned it, it acts
> on its own inside hard guardrails.
>
> The thesis underneath: trust compounds, and you spend it in order. I've
> watched a "frictionless" feature backfire because we skipped the earning
> step. I won't skip it again.

**Beats:** direction + sequence, not a wishlist → year 1 cheap and
verifiable, year 2 judgment + human, year 3 autonomy in guardrails → the
thesis (trust compounds, spent in order) → tie to the Zillow lesson.

> Staff move: a sequenced thesis with a principle under it. Admitting the
> three-year detail is mostly wrong is itself the senior move.

---

## 4. Execution and metrics

### "How would you measure the success of [feature]?"

**Say it:**

> I start one level up from the feature, with the job it serves, or I'll
> pick a vanity metric by accident.
>
> One primary metric that IS the customer getting what they came for. One or
> two guardrails that catch me cheating the primary. And a counter-metric
> for the second-order harm.
>
> Concrete version: when I rebuilt applications, the primary was submission
> rate, 44 to 70. The guardrail was change-failure rate, held at zero. And
> the counter-metric mattered most - applicant quality, because a flood of
> junk applications is a "win" that makes the customer's life worse. I've
> killed a feature that won the primary and failed the counter-metric.

**Beats:** go up to the job first → one primary (the customer's success) →
guardrails (catch the cheat) → counter-metric (second-order harm) → ground
in 44-to-70, zero change-failure, the Zillow kill.

> Staff move: the counter-metric. "A metric you can cheat is worse than no
> metric."

### "A key metric drops 20% overnight. Walk me through it."

**Say it:**

> First reflex, said out loud: before I theorize, is it real? Half of
> overnight drops are instrumentation - a logging change, a deploy, a busted
> event. I confirm the metric before I panic the team.
>
> If it's real, I cut it three ways fast. When did it start - pin it to a
> change or a release. Who's affected - everyone, or one segment, one
> platform, one geography. And what moved with it. The cut usually finds it.
>
> Then internal versus external. Did we ship something, or did the world
> change - a holiday, a competitor, an outage upstream. Hypothesis in an
> hour, cause in a day, and I tell the team what I know and don't know the
> whole way.

**Beats:** is it real first (instrumentation) → segment the drop (when / who
/ what moved with it) → internal vs external → timebox and communicate.

> The instrumentation-first instinct is the data tell. Lead with it.

### "How do you prioritize your roadmap?"

**Say it:**

> The honest version, not the framework version. I do a rough value-over-
> effort sort, but the real work is upstream of the scoring.
>
> Everything on my roadmap traces back to one artifact - a jobs-to-be-done
> map I build from 50 to 100 customer calls a year. If a bet doesn't map to
> a real job, it doesn't get scored, it gets cut. That kills most of the
> debate before it starts.
>
> Then value over effort, with two thumbs on the scale. Anything that's a
> compliance or trust risk jumps the line. Anything reversible I'll ship
> early to learn. The transcript of a call is the easy part. The map is the
> work.

**Beats:** don't lead with a framework → lead with the upstream artifact
(the map from calls) → does-it-map-to-a-job gate → then value/effort with
two overrides (risk jumps, reversible ships early) → land on "the map is the
work."

> Staff move: prioritization is a forcing function I built, not a
> spreadsheet I filled in. A process other people can run.

### "How many [X] are there?" (market sizing)

*Less common at senior PM, but if it lands: structured reasoning, stated
assumptions, don't freeze. Speed and transparency beat precision.*

**Say it:**

> I'll think out loud, correct my assumptions as I go - the number matters
> less than the structure.
>
> I'd anchor on something I know [population, households, units], break out
> the segment that matters, apply a rate, and sanity-check against a second
> path. [Walk one concrete chain.] Call it [X], order of magnitude. If you
> told me the real number I'd expect to be within a factor of three, and the
> assumption I'm least sure about is [name it].

**Beats:** narrate and invite correction → anchor on a known → segment →
apply a rate → cross-check with a second method → give a number, name your
weakest assumption.

---

## 5. Behavioral and leadership (the staff round)

This is where the level is won or lost. Two rules. Use STAR but bury the
scaffolding - they should hear a story, not "Situation, Task, Action,
Result." And the result is a number or a changed behavior, landed flat.

Build the story bank (Appendix A) so I'm never reaching.

### FLAGSHIP - "Tell me about a hard call." / "A time you killed something that was working."

*This one story answers at least six questions. Learn it cold.*

**Say it:**

> I built an API with Zillow that pre-filled rental applications - moved
> applicant PII between platforms, securely. Launched Zillow as the first
> use case, got to 70% adoption. By every dashboard I owned, it was a win.
>
> Then I watched the calls. The frictionless path was burying property
> managers in unqualified applicants. We'd optimized the funnel and made the
> customer's job worse. The metric was green and the customer was drowning.
>
> So I pushed to wind it down. My own 70%-adoption feature. Not a popular
> call - it had a logo and a number attached. But the number was measuring
> the wrong person's success.
>
> What I took from it: pick the metric that belongs to the customer, not the
> funnel. I'd rather kill a green dashboard than defend it.

**Beats:** the win on paper (70%, a logo) → the signal no dashboard showed
(watched the calls) → name the failure crisply (green metric, drowning
customer) → the call (kill my own win, unpopular) → the lesson, flat.

**If they push** ("how'd you get others to agree?"): I didn't argue with
opinion, I brought the calls. Three recordings of a property manager
describing the same pain ends the debate faster than any deck.

> Answers: hard call, said no, disagreed with the data, a failure, customer
> obsession, influencing up. Six for one.

### "A conflict with engineering." / "A time you disagreed with your team."

**Say it:**

> On the application rebuild, my tech lead wanted to refactor both codebases
> first - do it right, then build. I wanted to ship the new flow on the old
> foundation and refactor under live traffic. Real disagreement, both
> defensible.
>
> Instead of seniority-jousting, we wrote down what "done" meant and what we
> were each afraid of. His fear was a fragile foundation. Mine was burning a
> quarter with nothing for the customer. So we found the seam - hardened the
> one path the new flow actually touched, shipped, refactored the rest
> after. 44 to 70, zero change-failure rate. He was right about the risk, I
> was right about the timing, and the spec is what let us both be right.

**Beats:** a real two-sided disagreement → de-escalate (write down "done,"
name the fears) → the synthesis (the seam) → result (numbers) → credit him.

> Being generous to the other side is the senior tell.

### "Influencing without authority."

**Say it:**

> I'm the sole PM on the application line. Nobody reports to me, and three
> stakeholder groups have to move together. I move a room with evidence and
> a shared artifact, not authority.
>
> When I wanted the team on spec-driven work - write the behavior down,
> pressure-test it before code, gate releases on evals - I didn't mandate
> it. I ran it on one feature, showed the change-failure rate, and let the
> result recruit people. Now it's how the team works. You change how people
> work by making the better way the easier way, once, where they can see it.

**Beats:** the setup (no authority, many stakeholders) → mechanism (evidence
+ artifact, not mandate) → the spec-driven rollout as proof → the principle.

> Staff move: changing how the TEAM works, not just shipping my own feature.
> The clearest staff signal in here. Lead with it if they ask about scope.

### "Tell me about a failure."

**Say it:**

> Same Zillow integration, before it was a good decision. I shipped a
> frictionless path without asking who the friction was protecting. Friction
> in an application isn't always a bug - some of it is the filter that keeps
> a property manager from drowning. I optimized for the applicant and forgot
> the property manager is the one who pays the bill.
>
> I caught it from customer calls, not dashboards, which told me my
> instrumentation was watching the wrong person. Now I don't ship a flow
> without a counter-metric for the party who isn't in the room. The
> wind-down was the fix. The counter-metric was the lesson.

**Beats:** own a real mistake → root cause (optimized for the wrong party) →
how I caught it → the systemic fix I carry forward (the counter-metric
habit).

> Zillow runs as the hard-call win OR the failure - just change which end
> you stress, the call or the mistake that came before it. Never both
> framings in the same interview.

### "Managing up." / "Disagreeing with a senior leader."

**Say it:**

> Leadership wanted to expand the frictionless integrations - the adoption
> numbers were great, the logos were good. I was the one saying slow down.
> Disagreeing up is where a lot of PMs go quiet.
>
> I didn't make it my opinion versus theirs. I brought the counter-metric
> and the calls, and I framed it as protecting a number they cared about
> more than adoption - retention of property managers, who churn when
> they're buried in junk. Same data that changed my mind, handed to them.
> They didn't have to lose face to agree. They just had to see what I saw.

**Beats:** the stakes (disagreeing up) → not opinion vs opinion → tie my
position to a metric THEY value more → give them the easy out, no face lost.

### "Leading through ambiguity."

**Say it:**

> Moving from data scientist to PM at Lively, nobody handed me a roadmap.
> The data-services platform didn't exist yet - I was building the thing and
> defining the role at the same time. Maximum ambiguity.
>
> My move in ambiguity is to find the one decision that's irreversible once
> it's wrong, de-risk only that, and leave everything else loose. For us it
> was the data model partners would build on - get that wrong and every
> integration inherits the mistake. So we over-invested there and stayed
> cheap and changeable everywhere else. Moved $50M across institutions with
> zero data loss. Ambiguity isn't "do everything," it's "find the one thing
> you can't take back, and only nail that."

**Beats:** a genuinely ambiguous setup (defining the role itself) → the
principle (find the one irreversible decision, nail only that) → the
concrete one (the data model) → result ($50M, zero loss) → restate the
principle.

---

## 6. The AI-native / technical PM round (2026)

My edge. I've built this, at work and at home. Don't get academic - lead
with what I shipped. Two stories I reuse here:

- **AbiertoClaw** - the iMessage assistant running my family's calendar.
  Swappable model sources, a complexity router, a daily best-free-model
  picker.
- **The AppFolio follow-up** - AI inside a compliance boundary, +18% CSAT,
  every interaction auditable.

### "How do you evaluate an AI feature? How do you know it's good enough to ship?"

**Say it:**

> Evals are the whole ballgame, and they're the part teams skip because
> they're boring. An AI feature isn't shippable for me until it's gated on
> evals the same way we gate on tests.
>
> Concretely: I build a labeled set from real cases, including the ugly ones
> pulled from customer calls, and score every release against it before it
> ships. Exact-match where there's a right answer. A model grading against a
> rubric where there isn't. And a regression gate - a release can't lower
> the score. "It seems better" is how you ship a quiet regression to a
> thousand customers.
>
> The mindset shift: an AI feature is never done, it's monitored. The eval
> set is the product, as much as the prompt is.

**Beats:** evals are the ballgame, teams skip them → labeled set from REAL
cases (incl. the ugly ones) → exact-match where there's truth, model-as-
judge on a rubric where there isn't → regression gate → "the eval set is the
product."

> Staff move: treating the eval set as an asset and gating releases on it.
> That's the operating-bar answer.

### "How do you handle hallucination?"

**Say it:**

> You manage it, you don't eliminate it - anyone promising zero is selling
> something. So I design for the model being wrong, not for it being
> perfect.
>
> Four moves, roughly in order. Ground it - retrieval over a source of truth
> so it's quoting, not remembering. Constrain it - the narrower the job, the
> less room to invent. Cite it - show the source so a human checks in one
> glance. And fail gracefully - when confidence is low, hand off to a person
> or say "I don't know" instead of bluffing. The product question isn't "is
> it ever wrong," it's "what happens when it is, and who gets hurt."

**Beats:** manage, don't eliminate → ground (retrieval) → constrain (narrow
the job) → cite (checkable) → fail gracefully (handoff / abstain) → reframe
to "what happens when it's wrong, and who gets hurt."

### "When would you NOT use AI?" (the judgment question)

**Say it:**

> Often, honestly. I like AI where being wrong is cheap and checkable. I
> avoid it where being wrong is expensive and invisible.
>
> So I don't reach for a model when a deterministic rule is more reliable
> and a regulator is going to ask how it decided - in payments and
> screening, "the model felt like it" is not an answer. I don't use it where
> latency or cost outweighs the lift, or where a wrong answer erodes trust
> faster than a right one builds it. My AppFolio follow-up is the line drawn
> well: AI drafts and routes, but the whole thing stays inside the
> authenticated app and auditable, because it touches screening compliance.
> AI where it helps, guardrails where it has to.

**Beats:** "often" (confidence to say no to AI) → the rule (cheap+checkable
yes, expensive+invisible no) → deterministic-rule and regulated-decision
cases → latency/cost and trust cases → ground in the compliance-bounded
follow-up → land on "AI where it helps, guardrails where it has to."

> Staff move: saying "not here" with a principled line. Most candidates
> oversell AI. I scope it. That's the judgment these roles screen for.

### "Walk me through building a RAG / agent feature."

**Say it:**

> Take a real one - a support assistant over our help content. I build it
> retrieval first, generation second, because most "the AI is dumb"
> complaints are retrieval problems wearing a costume.
>
> Order of work: get the knowledge into a clean, chunked, current source -
> that's most of the quality right there. Retrieve the right passages. Have
> the model answer only from those passages, with citations. Generation is
> the last twenty percent. Then wrap it in evals and a containment metric -
> what share of questions it resolves without a human - and a clean handoff
> for the rest.
>
> If it's an agent taking multi-step actions, I add one rule: autonomy is a
> dial, not a switch. It earns each new action by proving reliability on the
> last one, and anything irreversible keeps a human on the hook until the
> evals say otherwise.

**Beats:** pick a concrete feature → retrieval first, generation second →
clean/chunked/current knowledge is most of the quality → answer-from-
passages + citations → evals + containment + handoff → for agents: autonomy
is a dial, irreversible keeps a human.

### "How do you choose a model? Build vs. buy?"

**Say it:**

> Buy the model, build everything around it. The frontier weights aren't my
> moat and they change every few months. My moat is the eval set, the
> retrieval, the workflow, the proprietary data. I'll happily swap the model
> under the product.
>
> I built this for myself, actually - the assistant running my family's
> calendar has swappable model sources, a router that sends easy requests to
> a cheap model and hard ones to a strong model, and a job that picks the
> best free model each day. Same instinct at product scale: default to the
> best model, route by complexity to control cost and latency, keep the
> switching cost low so you're never married to a vendor.

**Beats:** buy the model, build the moat (evals, retrieval, workflow, data)
→ weights aren't the moat and they churn → ground in AbiertoClaw (swappable
sources, complexity router, daily best-free picker) → at product scale:
best-model default + route by complexity + low switching cost.

> A flex - I built a model router at home. Say it plainly, it lands.

### "How do you measure an AI product?"

**Say it:**

> Not by engagement. Engagement on an AI feature can mean it's failing -
> they're retrying because it got it wrong the first time. I measure task
> success: did the user get the outcome they came for, in one pass.
>
> Primary is resolution or task-success rate. Then a cost-and-latency budget
> per task, because an AI feature that's right but slow and expensive
> doesn't ship. Then human-escalation rate as the honesty check. And under
> all of it, the offline eval score trending the right way release over
> release. Same discipline as any product - just don't let "it's AI" smuggle
> in vanity metrics.

**Beats:** NOT engagement (retries = failure) → task-success as primary →
cost+latency budget per task → escalation rate as honesty check → eval trend
underneath → "don't let 'it's AI' smuggle in vanity metrics."

### "An AI product you admire? Something overhyped?"

**Say it** (short): pick one I actually use, name the specific thing it gets
right (does the boring verifiable work well, fails gracefully), then one
honest overhype - agents that demo beautifully and break on step four.
Specific plus a little contrarian reads as someone who ships, not someone
who reads threads.

---

## 7. The reverse round (my questions for them)

At staff level the questions are part of the test. Generic ones cost me.
Pick three, tuned to who's in the room.

**For the hiring manager:**

- What's the hardest tradeoff this team made in the last six months, and who
  was unhappy about it? (How they really decide.)
- What does the staff bar look like here - what does someone a level above
  this role do that others don't?
- Where is AI actually load-bearing in the product, versus where is it a
  demo? (You hear instantly how real it is.)

**For a peer or cross-functional partner:**

- Where do product and engineering rub here, and how does it usually
  resolve?
- What's something leadership believes that you think is wrong?

**For an exec:**

- If we're wildly successful in two years, what changed about the business?
  What was the bet?
- What would make you regret this hire in a year? (Bold. Lands at senior
  level. Gives me the real bar.)

**Closing, when they ask "anything else?":**

> One thing I want to make sure you have: [the single most relevant proof
> point for this role, one sentence]. And I'll say it plainly - I want this
> one. Thank you for the time.

Land on warmth, not the ask. Same instinct as a good email.

---

## Appendix A: The story bank

One story, many questions. Pattern-match in the room.

| Story | Numbers to drop | Answers |
| --- | --- | --- |
| Zillow PII pre-fill, then wind-down | 70% adoption, killed it | hard call · said no · disagreed with data · a failure · customer obsession · managing up |
| Application rebuild | 44% → 70%, zero change-failure, vacancies filled 3.4 days faster | execution · conflict with eng · measuring success · a win · shipping under constraint |
| $50M HSA migration | $50M moved, zero data loss, two teams → one | ambiguity · technical depth · high-stakes execution · money + trust |
| Jobs-to-be-done map | 50-100 calls/year | prioritization · customer empathy · how I decide |
| Spec-driven + evals rollout | adopted team-wide from one pilot | influence without authority · raising the bar · how I run AI delivery · staff signal |
| In-app compliant AI follow-up | +18% CSAT, auditable | responsible AI · when not to / guardrails · regulated workflow |
| AbiertoClaw (home assistant) | complexity router, swappable models, daily best-free picker | model choice · cost/latency · build vs buy · "show me you actually build" |
| Data scientist → PM arc | promoted as the work became the roadmap | tell me about yourself · why PM · growth |

## Appendix B: Numbers cheat sheet (the concrete nouns)

- 44% → 70% submission. Zero change-failure rate. Vacancies filled 3.4 days
  faster.
- +18% CSAT on the AI follow-up.
- Zillow: 70% adoption, then wound down.
- ~$40M/year in payments. Sole PM. Three stakeholder types, two codebases.
- 50-100 customer calls a year.
- Lively: $50M+ in HSA assets migrated, zero data loss, two teams to one.
- Oracle: rebuilt model validation on a representative US sample; automated a
  pipeline that took two analysts full-time.

One number per answer, minimum. But don't machine-gun them. A single
well-placed "44 to 70" beats five stats.

## Appendix C: Closers (land hard and stop)

- "The number was measuring the wrong person's success."
- "The transcript is the easy part. The map is the work."
- "AI where it helps, guardrails where it has to."
- "I'd rather kill a green dashboard than defend it."
- "Find the one thing you can't take back, and only nail that."
- "Make the better way the easier way, once, where they can see it."
- "Quant who became a builder."

Seasoning, not sauce. One per answer. If you can feel the wind-up, cut it.

## Appendix D: Five-minute warmup (before each call)

1. Three only-true-of-them facts. One product detail, one strategic bet, one
   thing I'd learn here.
2. Re-read the story bank. Pick the two strongest for this role.
3. One breath on the voice: specific, plain, a little dry, land hard and
   stop.
4. Decide "why this one" in a sentence. Mean it.
5. Water. Smile before the camera turns on. The work is done. Now just talk.
