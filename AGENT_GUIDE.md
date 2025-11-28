# CSS Helper MCP - Agent Guide

## 🎯 Purpose
This guide ensures agents follow the complete 5-phase investigation protocol and handle errors properly.

---

## 📋 Mandatory 5-Phase Investigation Protocol

### Starting Point
**Always begin with:** `css_investigate_start`
- Provide clear description of the CSS issue
- Returns investigation ID - **SAVE THIS ID** for all subsequent steps
- Returns relevant CSS knowledge to guide your investigation

---

### Phase 1: Component Structure Analysis ✅ REQUIRED
**Tool:** `css_phase1_structure`

**Purpose:** Find and analyze components related to the issue

**Arguments:**
- `investigationId` - from start step
- `componentPattern` - glob pattern (e.g., `**/*Dashboard*.tsx`)
- `workspacePath` - full workspace path

**What it finds:**
- Component files matching the issue
- Material-UI bgcolor mismatches (critical for ACRE Dashboard bugs)
- Grid spacing issues
- Dialog padding problems
- Color contrast violations

**Success criteria:** Files found and analyzed
**Error recovery:** If no files found, adjust pattern and retry
**Next step:** Phase 2 (CSS cascade) OR skip to Phase 4 if Material-UI only

---

### Phase 2: CSS Cascade Tracing ⚠️ CONDITIONAL
**Tool:** `css_phase2_cascade`

**Purpose:** Find custom CSS rules that might conflict

**Arguments:**
- `investigationId`
- `cssPattern` - glob pattern (e.g., `**/*.css`)
- `workspacePath`

**When to run:** If project has custom CSS files
**When to skip:** Material-UI only projects (no custom CSS)
**Error recovery:** If no CSS found, skip to Phase 4
**Next step:** Phase 3 (if CSS found) OR Phase 4

---

### Phase 3: Conflict Detection ⚠️ CONDITIONAL
**Tool:** `css_phase3_conflicts`

**Purpose:** Detect CSS specificity battles and !important overrides

**Arguments:**
- `investigationId`

**When to run:** Only if Phase 2 found CSS rules
**When to skip:** If Phase 2 was skipped
**Next step:** Always Phase 4

---

### Phase 4: Browser Inspection 🌐 CHOOSE ONE

#### Option A: Live Browser (Preferred)
**Tool:** `css_phase4b_browser`

**Purpose:** Inspect computed styles in real browser

**Arguments:**
- `investigationId`
- `elementSelector` - CSS selector (e.g., `.recharts-responsive-container`)
- `autoLaunch` - `true` (auto-launches Edge with debugging)
- `headless` - `false` (visible browser window)
- `chromePort` - `9222` (default)

**What it does:**
- Auto-launches Edge with DevTools Protocol enabled
- Connects to browser on port 9222
- Extracts computed styles from live DOM
- **Auto-captures screenshot** to temp folder
- Returns actual rendered values

**Error recovery path:**
```
IF browser fails with "Canceled" or ECONNREFUSED:
  1. Check if Edge is already running (close it)
  2. Check port 9222: netstat -ano | findstr :9222
  3. Try manual launch: msedge.exe --remote-debugging-port=9222
  4. IF still fails → Use Option B (screenshot analysis)
```

#### Option B: Screenshot Analysis (Fallback)
**Tool:** `css_analyze_screenshot`

**Purpose:** Analyze visual issues from screenshot without browser

**Arguments:**
- `investigationId`
- `screenshotPath` - path to screenshot file
- `issue` - description of visual problem

**When to use:**
- Browser connection fails repeatedly
- User provides screenshot directly
- Investigating visual bugs (bgcolor, contrast, layout)

**What it detects:**
- Color distribution (bgcolor issues)
- Large uniform areas (invisible elements)
- Contrast problems
- Material-UI gray palette usage

**Next step:** Always Phase 5

---

### Phase 5: Solution Design ✅ REQUIRED
**Tool:** `css_phase5_solution`

**Purpose:** Generate complete fix with code examples

**Arguments:**
- `investigationId`

**What it provides:**
- Root cause analysis
- Before/after code comparison
- Step-by-step fix instructions
- CSS knowledge best practices
- Visual diff (if screenshots available)

**This is the final deliverable** - do not skip this phase!

---

## 🚨 Error Handling Rules

### If Phase 1 Fails (No Files Found)
```
DO NOT STOP - Try these:
1. Broaden the pattern: "**/*.tsx" → "**/*"
2. Ask user for specific file name
3. List directory contents to find correct path
4. Check workspace path is correct
```

### If Phase 4b Fails (Browser Connection)
```
DO NOT STOP - Use fallback:
1. Record the error in investigation state
2. Inform user: "Browser connection failed, using screenshot analysis"
3. Call css_analyze_screenshot instead
4. Continue to Phase 5 with available data
```

### If Any Phase Errors
```
DO NOT ABANDON INVESTIGATION:
1. Mark phase as skipped/error in state
2. Document what failed and why
3. Continue with next available phase
4. Phase 5 will work with partial data
```

---

## 📊 Progress Tracking

Each phase completion updates investigation state:
```typescript
investigation.completedPhases.push(phaseNumber);
investigation.currentPhase = nextPhase;
investigation.phaseErrors.set(phaseNumber, errorMessage); // if error
```

Every tool response includes progress indicator:
```
Progress: [Phase 1 ✅] → [Phase 2 ✅] → [Phase 3 🔄] → [Phase 4 ⏸️] → [Phase 5 ⏸️]
```

---

## ⚡ Mandatory Next Steps

**Every phase tool response ends with:**

```markdown
## ⚡ MANDATORY NEXT STEP

**YOU MUST NOW:** Run `tool_name` with these arguments...

**Arguments needed:**
- param1: value
- param2: value

**OR if condition applies:**
- Alternative path...

**DO NOT skip this step unless [specific condition].**
```

**Agents must:**
1. Read the "MANDATORY NEXT STEP" section
2. Execute the specified tool immediately
3. Follow alternative paths only when explicitly stated
4. Never end without completing Phase 5

---

## 🎯 Success Criteria

### Investigation is complete when:
1. ✅ Phase 1 executed successfully
2. ✅ Phase 2/3 executed OR skipped with reason
3. ✅ Phase 4 executed (browser OR screenshot)
4. ✅ Phase 5 delivered final solution
5. ✅ User has actionable code to fix the issue

### Investigation is incomplete if:
- ❌ Stopped after Phase 1
- ❌ Skipped phases without documented reason
- ❌ Phase 4b failed and no screenshot analysis attempted
- ❌ No Phase 5 solution generated

---

## 🔧 Real-World Example: ACRE Dashboard bgcolor Bug

**Issue:** "Dashboard has invisible chart area - bgcolor is grey.50 but renders white"

**Correct flow:**

1. **Phase 1:** `css_phase1_structure`
   - Pattern: `**/*Dashboard*.tsx`
   - **Finds:** `sx={{ bgcolor: 'grey.50' }}` in Dashboard.js
   - **Detects:** Material-UI bgcolor mismatch (CRITICAL)

2. **Phase 2:** Skip (Material-UI only, no custom CSS)

3. **Phase 3:** Skip (Phase 2 skipped)

4. **Phase 4b:** `css_phase4b_browser`
   - Selector: `.recharts-responsive-container`
   - **Launches Edge successfully**
   - **Finds computed:** `background-color: rgb(255, 255, 255)` (white)
   - **Screenshot captured:** Shows white background instead of gray

5. **Phase 5:** `css_phase5_solution`
   - **Root cause:** `grey.50` not a valid Material-UI color token
   - **Fix:** Change to `grey[50]` (array notation)
   - **Before/after code provided**
   - **Visual diff shown**

**Result:** Complete solution with proof it works ✅

---

## 💡 Pro Tips for Agents

1. **Save the investigation ID** - you need it for every phase
2. **Read Material-UI findings carefully** - they often contain the complete answer
3. **If Phase 4b fails once, try screenshot analysis** - don't waste retries
4. **Phase 5 works with partial data** - even if some phases skipped
5. **Always include investigationId in error reports** - helps debugging
6. **Use progress indicators** - users like seeing advancement

---

## 🔍 Tool Quick Reference

| Phase | Tool | Required? | Depends On |
|-------|------|-----------|------------|
| Start | `css_investigate_start` | ✅ Always | Nothing |
| 1 | `css_phase1_structure` | ✅ Always | Start |
| 2 | `css_phase2_cascade` | ⚠️ If CSS exists | Phase 1 |
| 3 | `css_phase3_conflicts` | ⚠️ If Phase 2 ran | Phase 2 |
| 4A | `css_phase4b_browser` | ⚠️ If browser works | Phase 1-3 |
| 4B | `css_analyze_screenshot` | ⚠️ If 4A fails | Phase 1-3 |
| 4C | `css_compare_screenshots` | 🎁 Optional | Phase 4A/B |
| 5 | `css_phase5_solution` | ✅ Always | Phase 1-4 |

**Utility Tools** (use anytime):
- `css_search_knowledge` - Search CSS knowledge base
- `css_read_component` - Read component file contents
- `css_get_knowledge` - Get all CSS patterns
- `css_batch_apply` - Find similar components and propose batch styling changes ✨ NEW

---

## 🔄 Batch Application Protocol

### When to Use css_batch_apply

**ALWAYS use before applying style changes to ensure consistency:**

```
User: "Add padding to ProfileCard"
Agent: [STOP - Check for similar components first]
Agent: Run css_batch_apply to find related components
Agent: Show user all similar components found
Agent: Ask: "Apply to all or just target?"
```

### How Batch Application Works

1. **Detect Similar Components**
   - Searches workspace for components with similar structure
   - Calculates similarity scores (0-100%)
   - Identifies shared patterns (Grid, Card, MUI usage)

2. **Show Scope Analysis**
   ```markdown
   Found 3 similar components:
   - ProfileCard (target) - 100%
   - DashboardCard - 85% similar
   - StatCard - 82% similar
   
   All use CardContent in Grid layout.
   ```

3. **Get User Confirmation**
   - Recommend batch application for consistency
   - Let user choose: all, selective, or just target

4. **Apply Consistently**
   - Update all selected components
   - Maintain consistency across codebase

### Example Workflow

**❌ OLD Way (Without Batch Check):**
```
User: "Add padding to ProfileCard"
Agent: [Adds padding to ProfileCard]
User: "Do the same for DashboardCard"
Agent: [Adds padding to DashboardCard]
User: "And StatCard..."
```
**Result:** 3 requests for same change 😞

**✅ NEW Way (With Batch Check):**
```
User: "Add padding to ProfileCard"
Agent: [Runs css_batch_apply first]
Agent: "Found 3 similar Card components. Apply to all?"
User: "Yes"
Agent: [Applies to all 3 at once]
```
**Result:** 1 request, complete solution! 🎯

### Integration with Phase 1

Phase 1 now **automatically detects** similar components:

```markdown
## Phase 1 Output (Enhanced)

### 🔗 Similar Components Detected
- ProfileCard ↔️ DashboardCard (85% similar)
- ProfileCard ↔️ StatCard (82% similar)

⚠️ Consistency Recommendation: When applying style changes, 
consider applying to all similar components.

💡 Tip: Use `css_batch_apply` to update all at once.
```

### When NOT to Batch Apply

Only apply to single component if:
- User explicitly says "only ProfileCard"
- Component is unique (HomePage, UserProfile)
- Components are in different contexts
- Similarity score < 50%

---

## ✅ Agent Checklist

Before ending investigation, verify:
- [ ] Investigation ID obtained and used in all phases
- [ ] Phase 1 completed (files analyzed)
- [ ] **Similar components detected (check Phase 1 output)**
- [ ] **If making style changes: used css_batch_apply to check scope**
- [ ] Phase 2/3 completed OR skip reason documented
- [ ] Phase 4 attempted (browser OR screenshot)
- [ ] If Phase 4b failed, screenshot analysis attempted
- [ ] Phase 5 solution generated
- [ ] **If solution includes style changes: confirmed batch application**
- [ ] User has code to fix the issue
- [ ] Progress indicators showed throughout

**If all checked:** Investigation complete ✅  
**If any missing:** Continue investigation ⚠️

---

## 📞 When to Ask User

**Ask when:**
- File pattern unclear (which component?)
- CSS selector needed for Phase 4b (which element?)
- Screenshot not available for analysis
- **Similar components found: "Apply to all or just target?"** ✨ NEW

**Don't ask when:**
- Which phase to run next (follow protocol)
- Whether to skip phases (follow conditional rules)
- What to do if browser fails (use screenshot analysis)

---

## 💡 Pro Tips for Batch Application

1. **Phase 1 shows similarity automatically** - look for the "Similar Components Detected" section
2. **Use css_batch_apply before making changes** - not after
3. **Similarity > 70% = probably batch apply** - these components are very similar
4. **Grid/Container children = always batch** - consistent styling in containers
5. **Card/Button/Input variants = batch** - user expects consistency

---

**Remember:** The protocol is designed to be followed sequentially with documented skip conditions. **Always check for similar components before applying style changes!** Trust the process! 🎯
