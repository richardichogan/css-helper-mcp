import React from 'react';
import { Box, Grid, Paper, Dialog, DialogContent, Typography } from '@mui/material';

// Example 1: bgcolor mismatch (should be detected)
export function ProblematicComponent() {
  return (
    <Box sx={{ bgcolor: 'grey.50', p: 2 }}>
      <Typography>This will be invisible in dark theme!</Typography>
    </Box>
  );
}

// Example 2: Grid spacing (should be detected)
export function GridExample() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={6}>
        <Paper>Item 1</Paper>
      </Grid>
      <Grid item xs={6}>
        <Paper>Item 2</Paper>
      </Grid>
    </Grid>
  );
}

// Example 3: DialogContent without padding override (should be detected)
export function DialogExample() {
  return (
    <Dialog open={true}>
      <DialogContent>
        <Typography>Content with default 24px padding</Typography>
      </DialogContent>
    </Dialog>
  );
}

// Example 4: Good practices (should NOT be detected)
export function GoodComponent() {
  return (
    <Box sx={{ bgcolor: 'background.paper', p: 2 }}>
      <Typography>Theme-aware background</Typography>
    </Box>
  );
}

// Example 5: Multiple issues (real-world scenario)
export function Dashboard() {
  return (
    <Box sx={{ p: 3 }}>
      {/* Issue 1: bgcolor mismatch */}
      <Box sx={{ bgcolor: 'grey.100', p: 2, mb: 2 }}>
        <Typography variant="h6">Area 1</Typography>
      </Box>

      {/* Issue 2: Grid spacing */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          {/* Issue 3: Another bgcolor mismatch */}
          <Paper sx={{ bgcolor: 'white', p: 2 }}>
            <Typography>Card content</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Issue 4: DialogContent padding */}
      <Dialog open={true}>
        <DialogContent>
          <Typography>Dialog content</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
