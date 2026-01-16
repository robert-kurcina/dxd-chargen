# **App Name**: Sarna Len Character Forge

## Core Features:

- Attribute Generation: Generate initial character attributes randomly, with client-side effects only to avoid server-side issues.
- Skill Assignment: Allocate skill points based on character attributes, all handled in the `page.tsx` with `useMemo`.
- Social Rank display: Derive social rank and talents based on the character's attributes. Centralized calculation in the top-level component.
- Talent Suggestions (AI): Use a generative AI tool to suggest relevant talents based on character attributes and skills. This feature uses a tool for reasoning.
- Character Sheet Display: Display the final character sheet with all calculated attributes, skills, and talents, adhering to stable, one-way data flow principles.

## Style Guidelines:

- Primary color: Deep purple (#673AB7) to evoke mystery and power associated with role-playing.
- Background color: Light lavender (#E1D9ED), a desaturated version of the primary color, for a soft backdrop.
- Accent color: Electric indigo (#7C4DFF), an analogous hue to the primary color with increased brightness and saturation, for interactive elements and highlights.
- Body text: 'PT Sans', sans-serif. Headline text: 'Playfair', serif, for an elegant feel. To be paired together.
- Note: currently only Google Fonts are supported.
- Use thematic icons related to character attributes and skills.
- Subtle animations on attribute generation and talent suggestion.