# CSS Helper MCP - Quick Protocol Card

## 🎯 5-Phase Investigation Protocol

**ALWAYS follow this sequence:**

```
START → 1 → 2 → 3 → 4 → 5 → DONE
        ✅   ⚠️   ⚠️   🌐   ✅
```

### Phase Checklist

- [ ] **START**: `css_investigate_start` (get investigation ID)
- [ ] **Phase 1**: `css_phase1_structure` (REQUIRED - find components)
- [ ] **Phase 2**: `css_phase2_cascade` (skip if no CSS files)
- [ ] **Phase 3**: `css_phase3_conflicts` (skip if Phase 2 skipped)
- [ ] **Phase 4**: `css_phase4b_browser` OR `css_analyze_screenshot` (browser first, screenshot if fails)
- [ ] **Phase 5**: `css_phase5_solution` (REQUIRED - final deliverable)

---

## ⚠️ Error Recovery

### If Phase 4b (browser) fails:
```
❌ Browser failed → ✅ Use css_analyze_screenshot instead
```

**DO NOT:**
- ❌ Stop the investigation
- ❌ Skip to Phase 5 without any Phase 4 data
- ❌ Retry browser connection more than once

**DO:**
- ✅ Switch to screenshot analysis immediately
- ✅ Document the error in investigation state
- ✅ Continue to Phase 5 with screenshot data

---

## 💡 Quick Tips

1. **Save investigation ID** - needed for all phases
2. **Phase 1 often solves it** - Material-UI detection catches 80% of issues
3. **Browser auto-launches** - set `autoLaunch: true`
4. **Screenshot is reliable** - don't waste time on browser retries
5. **Phase 5 always runs** - works with partial data

---

## 🔍 Material-UI Pattern Recognition

Common issues Phase 1 detects automatically:

| Code Pattern | Issue | Fix |
|--------------|-------|-----|
| `bgcolor="grey.50"` | Invalid prop syntax | `bgcolor="grey[50]"` |
| `sx={{ bgcolor: 'grey.50' }}` | Invalid token | `sx={{ bgcolor: 'grey[50]' }}` |
| `<Grid spacing="2">` | Wrong type | `<Grid spacing={2}>` |
| `<Dialog sx={{ p: 0 }}>` | No content padding | Add `<DialogContent sx={{ p: 3 }}>` |

---

## 📞 When Each Phase Is Needed

| Phase | Always? | Condition |
|-------|---------|-----------|
| START | ✅ Yes | Entry point |
| 1 | ✅ Yes | Foundation for all |
| 2 | ⚠️ Conditional | Only if custom CSS exists |
| 3 | ⚠️ Conditional | Only if Phase 2 found rules |
| 4 | ✅ Yes | Browser OR screenshot (choose one) |
| 5 | ✅ Yes | Final deliverable |

---

## 🎯 Success = Phase 5 Complete

**Investigation is only complete when:**
- Phase 5 has generated a solution
- User has actionable code to fix the issue
- Before/after examples are provided

**Everything else is preparation for Phase 5.**

---

See [AGENT_GUIDE.md](./AGENT_GUIDE.md) for detailed documentation.
