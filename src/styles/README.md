Theme tokens and usage

- `theme` exports color, spacing, radii, shadows, fonts and helpers.
- Use tokens in components by importing: `import { theme, cardStyle } from '../styles/theme'` or `import { theme } from '../styles/theme'` depending on path.
- Batch migration: replace string literals for colors, spacing, font-family, border-radius with `theme` values.

Example:
```
import { theme } from '../styles/theme'

const style = { background: theme.colors.cardBg, fontFamily: theme.fonts.ui }
```
