---
name: council
description: Convene a council of five advisors to stress-test a decision — validate a business idea, choose between two options, build a content strategy, pressure-test a launch, improve an offer, make a career decision, fix a productivity problem, create a learning plan, evaluate a purchase, or turn a goal into a plan. Use whenever the user asks for a council, a panel of advisors, a second opinion from several angles, or invokes /council.
argument-hint: "<template> [details] — e.g. /council validate-idea ..."
---

# Council of advisors

Ten reusable prompts. Each convenes five named advisors, has them assess the
question independently, makes them argue, and closes with a single verdict the
user can act on. The value is in the disagreement; five advisors who agree are
one advisor with a longer answer.

## Templates

| Template | Use when the user wants to… |
|---|---|
| [validate-idea](templates/01-validate-idea.md) | Validate a business idea for a target customer |
| [choose](templates/02-choose-between-two-options.md) | Choose between option A and option B |
| [content-strategy](templates/03-content-strategy.md) | Build a 30-day content strategy |
| [launch](templates/04-pressure-test-a-launch.md) | Pressure-test a product or service launch |
| [offer](templates/05-improve-an-offer.md) | Improve an offer and rewrite it |
| [career](templates/06-career-decision.md) | Make a career decision |
| [productivity](templates/07-productivity-problem.md) | Fix a recurring productivity problem |
| [learning-plan](templates/08-learning-plan.md) | Create a week-by-week learning plan |
| [purchase](templates/09-major-purchase.md) | Decide on a major purchase |
| [goal-plan](templates/10-goal-to-action-plan.md) | Turn a goal into an action plan |

If the user names none, pick the closest template from what they describe and
say which one you picked.

## How to run a session

1. **Read the template.** It fixes the five advisor roles, what each must cover,
   and the shape of the closing verdict. Do not swap roles or drop sections.
2. **Fill the placeholders from what the user gave you.** Every `[bracketed]`
   field must be filled before the council sits. If a field that changes the
   answer is missing (the price, the deadline, the budget, the target customer),
   ask for it in one message rather than guessing. Cosmetic gaps get a stated
   assumption, not a question.
3. **Advisors first, independently.** Write each advisor's section as if the
   others had not spoken. Each stays in role: the skeptical investor is
   skeptical, the ideal customer talks about their own life and not about
   market sizing, the contrarian disagrees with the room on purpose.
4. **Then the debate.** At least two advisors must challenge a specific claim
   another advisor made, by name, and the challenged advisor must respond —
   conceding, narrowing, or holding with a reason. A debate section with no
   changed position is a sign the first round was too safe.
5. **Chairman's verdict.** One voice, no hedging, every item the template asks
   for. Scores are integers out of 10 with one sentence of justification. Plans
   have dated or day-numbered steps.

## Rules that hold across every template

- **Do not invent facts.** No market sizes, statistics, competitor prices,
  testimonials or results the user did not supply. Where a number matters, say
  "you need to find out X" and put it in the assumptions to test.
- **Name the weakest assumption in the user's own framing.** Every idea arrives
  with something taken for granted. At least one advisor must find it.
- **Australian context by default.** The user is in Sydney. Currency is AUD,
  regulation is Australian, and seasons are southern-hemisphere unless the
  user says otherwise.
- **Advice must be affordable to act on.** Validation plans, experiments and
  first actions cost days and tens of dollars, not months and thousands. If
  the honest answer needs a bigger spend, say so and give the cheap proxy.
- **Keep it readable.** Headings for each advisor, the debate and the verdict.
  Bullets inside sections. A whole session should fit in one screen per
  advisor.

## Output skeleton

```
## The question
One paragraph restating the decision and the filled-in placeholders.

## Advisor 1 — <role>
## Advisor 2 — <role>
## Advisor 3 — <role>
## Advisor 4 — <role>
## Advisor 5 — <role>
(each covering exactly what the template asks of them)

## The debate
Named challenges and responses.

## Chairman's verdict
Every closing item the template lists, in the template's order.
```
