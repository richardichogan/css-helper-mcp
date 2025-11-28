# Copilot Instructions Template

Copy this file to your project's `.github/copilot-instructions.md` to ensure consistent styling behavior across all AI agents.

---

## Styling Consistency Protocol

When modifying CSS, Material-UI, or component styles:

### 1. **Always Check for Similar Components First**

Before applying any style change:
- ✅ Search the same directory for similar components
- ✅ Look for shared parent containers (Grid, Stack, Box)
- ✅ Identify components with similar names (ProfileCard, DashboardCard, StatCard)
- ✅ Check for components using the same UI elements (CardContent, Button variants)

### 2. **Ask About Scope - Don't Assume**

Never apply a style in isolation. Always ask:

```
I found these similar components:
- ProfileCard (target)
- DashboardCard (same structure)
- StatCard (same structure)

Should I apply [change] to:
[ ] Just ProfileCard (target only)
[ ] All 3 Card components (recommended for consistency)
[ ] Custom selection
```

### 3. **Provide Preview Before Applying**

Show what will change:

```markdown
## Proposed Changes

**Change:** Add padding: 3 to CardContent

**Affected files:**
1. src/components/ProfileCard.tsx
   - Line 25: <CardContent sx={{ padding: 3 }}>
2. src/components/DashboardCard.tsx
   - Line 18: <CardContent sx={{ padding: 3 }}>
3. src/components/StatCard.tsx
   - Line 32: <CardContent sx={{ padding: 3 }}>

Proceed? (Y/n)
```

### 4. **Component Pattern Recognition**

Automatically detect these common patterns:

| Pattern | Check For | Apply To |
|---------|-----------|----------|
| **Card variants** | ProfileCard, DashboardCard, StatCard | All cards in same container |
| **Button variants** | PrimaryButton, SecondaryButton | All buttons in same form/toolbar |
| **Input fields** | TextInput, NumberInput, EmailInput | All inputs in same form |
| **Grid items** | Grid item, Grid container | All items in same Grid |
| **List items** | ListItem, ListItemText | All items in same List |
| **Dialog components** | DialogTitle, DialogContent | All dialogs with similar structure |

### 5. **Shared Container Rules**

If components share a parent container, they should have consistent styling:

```tsx
// BAD - Inconsistent padding
<Grid container>
  <Grid item><CardContent sx={{ padding: 2 }} /></Grid>
  <Grid item><CardContent sx={{ padding: 3 }} /></Grid>  // Different!
  <Grid item><CardContent sx={{ padding: 2 }} /></Grid>
</Grid>

// GOOD - Consistent padding
<Grid container>
  <Grid item><CardContent sx={{ padding: 3 }} /></Grid>
  <Grid item><CardContent sx={{ padding: 3 }} /></Grid>  // Same
  <Grid item><CardContent sx={{ padding: 3 }} /></Grid>
</Grid>
```

### 6. **Material-UI Specific Rules**

#### Theme Consistency
- Use theme spacing: `theme.spacing(3)` or shorthand `3`
- Use theme colors: `theme.palette.primary.main` not hardcoded colors
- Use theme breakpoints: `theme.breakpoints.down('sm')`

#### Common Patterns
```tsx
// Card padding - apply to all cards in same context
<CardContent sx={{ padding: 3 }}>

// Grid spacing - apply to all Grid containers
<Grid container spacing={2}>

// Dialog padding - apply to all dialogs
<DialogContent sx={{ padding: 3 }}>

// Button sizing - apply to all buttons in same group
<Button size="large" sx={{ minWidth: 120 }}>
```

### 7. **Workflow for Style Changes**

```mermaid
Start
  ↓
Identify target component
  ↓
Search for similar components
  ↓
Found similar? 
  ├─ Yes → Ask: Apply to all or just target?
  │         ↓
  │    Show preview of all changes
  │         ↓
  │    Get user confirmation
  │         ↓
  │    Apply to selected components
  │
  └─ No → Apply to target only
      ↓
Verify consistency
  ↓
Done
```

### 8. **CSS-Helper Integration**

If the CSS-helper MCP server is available, use it:

```typescript
// Before applying style changes, check scope
css_batch_apply({
  targetComponent: "ProfileCard",
  changeDescription: "Add padding: 3 to CardContent",
  workspacePath: "/path/to/workspace"
})

// This will return:
// - List of similar components
// - Similarity scores
// - Recommendation (batch vs single)
```

### 9. **When NOT to Batch Apply**

Only apply to single component if:
- ❌ Component is explicitly unique (UserProfile, HomePage, etc.)
- ❌ Component has different requirements than siblings
- ❌ User explicitly says "only this component"
- ❌ Components are in different contexts (different pages/features)

### 10. **Error Prevention Checklist**

Before completing any styling task, verify:

- [ ] Searched for similar components in same directory
- [ ] Checked shared parent containers
- [ ] Asked user about batch application (if applicable)
- [ ] Previewed all changes before applying
- [ ] Applied changes consistently across selected components
- [ ] Verified visual consistency after changes

---

## Examples

### ❌ BAD: Single Component Change

```
User: "Add padding to ProfileCard"
Agent: [Adds padding to ProfileCard only]
User: "Now do the same for DashboardCard"
Agent: [Adds padding to DashboardCard]
User: "And StatCard too..."
Agent: [Adds padding to StatCard]
```
**Problem:** User had to ask 3 times for the same thing

### ✅ GOOD: Batch Analysis and Application

```
User: "Add padding to ProfileCard"
Agent: "I found 3 similar Card components:
        - ProfileCard (target)
        - DashboardCard (85% similar)
        - StatCard (82% similar)
        All use CardContent in Grid layout.
        Apply padding to all 3 for consistency?"
User: "Yes"
Agent: [Applies to all 3 at once]
```
**Result:** One request, complete solution

---

## Material-UI Patterns Reference

### Common Component Structures

```tsx
// Card Pattern - Check all files with this structure
<Card>
  <CardContent sx={{ padding: ? }}>
    {/* Apply consistent padding across all cards */}
  </CardContent>
</Card>

// Grid Pattern - Check all Grid containers
<Grid container spacing={?}>
  <Grid item xs={?}>
    {/* Apply consistent sizing and spacing */}
  </Grid>
</Grid>

// Dialog Pattern - Check all dialogs
<Dialog>
  <DialogTitle sx={{ padding: ? }}>
  <DialogContent sx={{ padding: ? }}>
  <DialogActions sx={{ padding: ? }}>
    {/* Apply consistent padding across dialog sections */}
</Dialog>

// Form Pattern - Check all form inputs
<TextField sx={{ margin: ? }} />
<Button sx={{ margin: ? }} />
  {/* Apply consistent spacing between form elements */}
```

---

## Quick Reference Card

| Situation | Action |
|-----------|--------|
| Adding padding to Card | Check all Cards in same Grid/container |
| Changing button size | Check all buttons in same form/toolbar |
| Adjusting Grid spacing | Check all Grid containers in same context |
| Modifying input styles | Check all inputs in same form |
| Setting Dialog padding | Check all dialogs in application |
| Changing font size | Check all text elements in same section |
| Adding margin | Check all siblings in same container |

---

## Integration with VS Code

This file should be placed at:
```
your-project/
├── .github/
│   └── copilot-instructions.md  ← Copy this content here
```

GitHub Copilot and Claude will automatically read this file and follow these guidelines when working in your workspace.

---

## Customization

Feel free to add project-specific rules:

```markdown
## Project-Specific Rules

### Our Card Standardization
- All dashboard cards use padding: 3
- All profile cards use padding: 2
- All metric cards use minHeight: 200

### Our Button Patterns
- Primary actions: size="large", minWidth: 120
- Secondary actions: size="medium", minWidth: 100
- Icon buttons: size="small", no minWidth

### Our Grid Layouts
- Dashboard: spacing={3}
- Forms: spacing={2}
- Lists: spacing={1}
```

---

**Remember:** The goal is consistency without repetition. Ask once, apply everywhere relevant! 🎯
