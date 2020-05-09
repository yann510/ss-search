import clsx from "clsx"
import Typography from "@material-ui/core/Typography"
import IconButton from "@material-ui/core/IconButton"
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft"
import Divider from "@material-ui/core/Divider"
import ListItem from "@material-ui/core/ListItem"
import ListItemIcon from "@material-ui/core/ListItemIcon"
import { Code, Dashboard, Timer } from "@material-ui/icons";
import ListItemText from "@material-ui/core/ListItemText"
import Drawer from "@material-ui/core/Drawer"
import React from "react"
import { makeStyles } from "@material-ui/core/styles"
import CssBaseline from "@material-ui/core/CssBaseline"
import AppBar from "@material-ui/core/AppBar"
import Toolbar from "@material-ui/core/Toolbar"
import MenuIcon from "@material-ui/icons/Menu"
import { Link, useLocation } from "react-router-dom"
import { Container } from '@material-ui/core';

const drawerWidth = 240

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
    },
    toolbar: {
        paddingRight: 24, // keep right padding when drawer closed
    },
    toolbarIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px 0 16px",
        ...theme.mixins.toolbar,
    },
    appBar: {
        zIndex: theme.zIndex.drawer + 1,
        transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    },
    appBarShift: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    menuButton: {
        position: "absolute",
        marginRight: 36,
    },
    menuButtonHidden: {
        display: "none",
    },
    menuLink: {
        display: "grid",
        gridTemplateColumns: "1fr 50px",
        alignItems: "center",
        textDecoration: "none",
        color: "inherit",
    },
    title: {
        flexGrow: 1,
    },
    drawerPaper: {
        position: "relative",
        whiteSpace: "nowrap",
        width: drawerWidth,
        transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    drawerPaperClose: {
        overflowX: "hidden",
        transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        width: 0,
    },
}))

function AppLayout() {
    const classes = useStyles()
    const location = useLocation()

    const [open, setOpen] = React.useState(false)

    const handleDrawerOpen = () => setOpen(true)
    const handleDrawerClose = () => setOpen(false)

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
                    >
                        <MenuIcon />
                    </IconButton>
                    <Container>
                    <Typography component="h1" variant="h6" color="inherit" noWrap className={classes.title}>
                        {(location.pathname === "/demo" || location.pathname === "/") && <>Demo with 10,000 entries</>}
                        {location.pathname === "/benchmark" && <>Benchmark</>}
                    </Typography>
                    </Container>
                </Toolbar>
            </AppBar>
            <Drawer
                variant="persistent"
                classes={{
                    paper: clsx(classes.drawerPaper, !open && classes.drawerPaperClose),
                }}
                open={open}
            >
                <div className={classes.toolbarIcon}>
                    <Typography component="h1" variant="h6">
                        ss-search
                    </Typography>
                    <IconButton onClick={handleDrawerClose}>
                        <ChevronLeftIcon />
                    </IconButton>
                </div>
                <Divider />
                <ListItem button key="Demo" selected={location.pathname === "/demo" || location.pathname === "/"}>
                    <Link to="/demo" className={classes.menuLink}>
                        <ListItemIcon>
                            <Dashboard />
                        </ListItemIcon>
                        <ListItemText primary="Demo" />
                    </Link>
                </ListItem>
                <ListItem button key="Benchmark" selected={location.pathname === "/benchmark"}>
                    <Link to="/benchmark" className={classes.menuLink}>
                        <ListItemIcon>
                            <Timer />
                        </ListItemIcon>
                        <ListItemText primary="Benchmark" />
                    </Link>
                </ListItem>
                <ListItem button key="Documentation">
                    <a className={classes.menuLink} href="https://github.com/yann510/ss-search#usage" target="_blank" rel="noopener noreferrer">
                        <ListItemIcon>
                            <Code />
                        </ListItemIcon>
                        <ListItemText primary="Documentation" />
                    </a>
                </ListItem>
            </Drawer>
        </div>
    )
}

export default AppLayout
