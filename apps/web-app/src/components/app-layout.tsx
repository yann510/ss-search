import clsx from 'clsx'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Drawer from '@mui/material/Drawer'
import React from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import { Link, useLocation } from 'react-router-dom'
import { Container, ListItemButton } from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import CodeIcon from '@mui/icons-material/Code'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ShutterSpeedIcon from '@mui/icons-material/ShutterSpeed'
import TimerIcon from '@mui/icons-material/Timer'

export const drawerWidth = 240

interface Props {
  onOpenChange: (open: boolean) => void
}

export function AppLayout(props: Props) {
  const { onOpenChange } = props

  const { classes } = useStyles()
  const location = useLocation()

  const [open, setOpen] = React.useState(false)

  const handleDrawerOpen = () => {
    onOpenChange(true)
    setOpen(true)
  }
  const handleDrawerClose = () => {
    onOpenChange(false)
    setOpen(false)
  }

  return (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar position="fixed" className={clsx(classes.appBar, open && classes.appBarShift)}>
        <Toolbar className={classes.toolbar}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            className={clsx(classes.menuButton, open && classes.menuButtonHidden)}
            size="large"
          >
            <MenuIcon />
          </IconButton>
          <Container>
            <Typography component="h1" variant="h6" color="inherit" noWrap className={classes.title}>
              {(location.pathname === '/demo' || location.pathname === '/') && <>DemoPage with 10,000 entries</>}
              {location.pathname === '/benchmark' && <>BenchmarkPage</>}
              {location.pathname === '/benchmark-version' && <>BenchmarkPage of all released versions of ss-search</>}
            </Typography>
          </Container>
        </Toolbar>
      </AppBar>
      <Drawer variant="persistent" className={classes.drawer} classes={{ paper: classes.drawerPaper }} anchor="left" open={open}>
        <div className={classes.toolbarIcon}>
          <Typography component="h1" variant="h6">
            ss-search
          </Typography>
          <IconButton onClick={handleDrawerClose} size="large">
            <ChevronLeftIcon />
          </IconButton>
        </div>
        <Divider />
        <Link to="/demo" className={classes.menuLink}>
          <ListItemButton key="Demo" selected={location.pathname === '/demo' || location.pathname === '/'}>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Demo" />
          </ListItemButton>
        </Link>
        <Link to="/benchmark" className={classes.menuLink}>
          <ListItemButton key="Benchmar" selected={location.pathname === '/benchmark'}>
            <ListItemIcon>
              <TimerIcon />
            </ListItemIcon>
            <ListItemText primary="Benchmark" />
          </ListItemButton>
        </Link>
        <Link to="/benchmark-version" className={classes.menuLink}>
          <ListItemButton key="Benchmark Version" selected={location.pathname === '/benchmark-version'}>
            <ListItemIcon>
              <ShutterSpeedIcon />
            </ListItemIcon>
            <ListItemText primary="Benchmark Version" />
          </ListItemButton>
        </Link>
        <a className={classes.menuLink} href="https://github.com/yann510/ss-search#usage" target="_blank" rel="noopener noreferrer">
          <ListItemButton key="Documentation">
            <ListItemIcon>
              <CodeIcon />
            </ListItemIcon>
            <ListItemText primary="Documentation" />
          </ListItemButton>
        </a>
      </Drawer>
    </div>
  )
}

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  toolbarIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px 0 16px',
    // ...theme.mixins.toolbar,
  },
  appBar: {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  menuButton: {
    position: 'absolute',
    marginRight: 36,
  },
  menuButtonHidden: {
    display: 'none',
  },
  menuLink: {
    display: 'grid',
    alignItems: 'center',
    textDecoration: 'none',
    color: 'inherit',
  },
  title: {
    flexGrow: 1,
  },
}))
