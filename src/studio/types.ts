/**
 * Study-note types: a small registry mapping type id → label, default folder,
 * built-in template body, and discriminating frontmatter. Used by the
 * "New study note" creation modal and by the reading-mode "studio chrome"
 * postprocessor that adapts rendering per type.
 *
 * Templates use simple {{placeholders}} replaced at creation time:
 *   {{title}}     — note title
 *   {{passage}}   — primary passage (canonical human form, e.g. "John 3:16")
 *   {{passageId}} — OSIS id (e.g. "John.3.16")
 *   {{date}}      — ISO date (YYYY-MM-DD)
 *   {{series}}    — optional series name (or empty string)
 */

export type StudyTypeId =
	| "sermon"
	| "inductive"
	| "word-study"
	| "exegetical"
	| "lectio"
	| "manuscript"
	| "reading-plan";

export type StudyType = {
	id: StudyTypeId;
	label: string;
	icon: string;
	description: string;
	defaultFolder: string;
	template: string;
};

const SERMON = `---
type: sermon
title: "{{title}}"
date: {{date}}
series: "{{series}}"
passages:
  - "{{passage}}"
osis: "{{passageId}}"
tags:
  - sermon
---

# {{title}}

> [!scripture] {{passage}}

## Context

> [!sermon-bigidea] Big idea
>

## Outline

1.
2.
3.

> [!sermon-application] Application
>

> [!sermon-illustration] Illustration
>

## Cross-references


## Notes

`;

const INDUCTIVE = `---
type: inductive
title: "{{title}}"
date: {{date}}
passages:
  - "{{passage}}"
osis: "{{passageId}}"
tags:
  - study
---

# {{title}}

> [!scripture] {{passage}}

## Observations — what does it say?


## Interpretation — what does it mean?


## Application — what do I do?


## Cross-references


`;

const WORD_STUDY = `---
type: word-study
title: "{{title}}"
date: {{date}}
passages:
  - "{{passage}}"
osis: "{{passageId}}"
tags:
  - word-study
---

# {{title}}

> [!scripture] {{passage}}

## Lemma & morphology


## Strong's


## Lexicon entries


## Usage across canon


## Theological notes


`;

const EXEGETICAL = `---
type: exegetical
title: "{{title}}"
date: {{date}}
passages:
  - "{{passage}}"
osis: "{{passageId}}"
tags:
  - exegesis
---

# {{title}}

> [!scripture] {{passage}}

## Historical & cultural context


## Literary structure


## Verse-by-verse


## Theological themes


## Bibliography


`;

const LECTIO = `---
type: lectio
title: "{{title}}"
date: {{date}}
passages:
  - "{{passage}}"
osis: "{{passageId}}"
tags:
  - lectio-divina
---

# {{title}}

> [!scripture] {{passage}}

## Lectio — read


## Meditatio — meditate


## Oratio — pray


## Contemplatio — rest in God


`;

const MANUSCRIPT = `---
type: manuscript
title: "{{title}}"
date: {{date}}
passages:
  - "{{passage}}"
osis: "{{passageId}}"
tags:
  - manuscript-study
---

# {{title}}

## Manuscript

> [!scripture] {{passage}}

## Markings & questions


## Patterns & themes


## Discussion notes


`;

const READING_PLAN = `---
type: reading-plan
title: "{{title}}"
date: {{date}}
passages:
  - "{{passage}}"
osis: "{{passageId}}"
tags:
  - reading-plan
---

# {{title}}

## Today's reading

> [!scripture] {{passage}}

## Reflection


## Prayer


`;

export const STUDY_TYPES: StudyType[] = [
	{
		id: "sermon",
		label: "Sermon",
		icon: "mic",
		description: "Preaching prep with big idea, outline, application, illustrations.",
		defaultFolder: "Studies/Sermons",
		template: SERMON,
	},
	{
		id: "inductive",
		label: "Inductive Bible study",
		icon: "search",
		description: "Observation → Interpretation → Application.",
		defaultFolder: "Studies/Inductive",
		template: INDUCTIVE,
	},
	{
		id: "word-study",
		label: "Word study",
		icon: "type",
		description: "Lemma, morphology, Strong's, usage across canon.",
		defaultFolder: "Studies/Word",
		template: WORD_STUDY,
	},
	{
		id: "exegetical",
		label: "Exegetical paper",
		icon: "file-text",
		description: "Historical context, structure, verse-by-verse, themes.",
		defaultFolder: "Studies/Exegetical",
		template: EXEGETICAL,
	},
	{
		id: "lectio",
		label: "Lectio Divina",
		icon: "heart",
		description: "Read, meditate, pray, contemplate — slow devotional reading.",
		defaultFolder: "Studies/Lectio",
		template: LECTIO,
	},
	{
		id: "manuscript",
		label: "Manuscript study",
		icon: "scroll",
		description: "Print the passage and mark it up; great for groups.",
		defaultFolder: "Studies/Manuscript",
		template: MANUSCRIPT,
	},
	{
		id: "reading-plan",
		label: "Reading plan entry",
		icon: "calendar",
		description: "One day of a daily reading plan with reflection space.",
		defaultFolder: "Studies/ReadingPlan",
		template: READING_PLAN,
	},
];

export function getStudyType(id: StudyTypeId): StudyType | undefined {
	return STUDY_TYPES.find((t) => t.id === id);
}

export function fillTemplate(
	tpl: string,
	vars: { title: string; passage: string; passageId: string; date: string; series: string }
): string {
	return tpl
		.replace(/\{\{title\}\}/g, vars.title)
		.replace(/\{\{passage\}\}/g, vars.passage)
		.replace(/\{\{passageId\}\}/g, vars.passageId)
		.replace(/\{\{date\}\}/g, vars.date)
		.replace(/\{\{series\}\}/g, vars.series);
}
