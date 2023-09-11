import { AppLayout, drawerWidth } from './app-layout'
import { Route, BrowserRouter, Routes } from 'react-router-dom'
import Demo from '../pages/demo-page'
import CssBaseline from '@mui/material/CssBaseline'
import Container from '@mui/material/Container'
import axios from 'axios'
import { flatten } from 'lodash'
import { Data } from '../models/data'
import BenchmarkPage from '../pages/benchmark-page'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { BackdropProgress } from './backdrop-loader'
import clsx from 'clsx'
import BenchmarkVersionPage from '../pages/benchmark-version-page'
import { useEffect, useState } from 'react'
import { makeStyles } from 'tss-react/mui'

export function App() {
  const { classes } = useStyles()
  const [isLoading, setIsLoading] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [data, setData] = useState<Data[]>([])

  useEffect(() => {
    async function fetchData() {
      const responses = await Promise.all(Array.from(Array(10).keys()).map((_, i) => axios.get<Data[]>(`assets/data-chunk-${i}.json`)))
      const data = flatten(responses.map((x) => x.data))

      setData(data)
      setIsLoading(false)
    }
    fetchData().catch((e) => console.error(e))
  }, [])

  return (
    <div className={classes.root}>
      <CssBaseline />
      <BrowserRouter>
        <BackdropProgress isLoading={isLoading} text="Loading 10,000 entries..." />
        <AppLayout onOpenChange={(open: boolean) => setIsDrawerOpen(open)} />
        <main
          className={clsx(classes.content, {
            [classes.contentShift]: isDrawerOpen,
          })}
        >
          <div className={classes.appBarSpacer} />
          <Container maxWidth="lg" className={classes.container}>
            <Routes>
              <Route path="/benchmark" element={<BenchmarkPage data={data} />} />
              <Route path="/benchmark-version" element={<BenchmarkVersionPage />} />
              <Route element={<Demo data={data} />} path="/" />
              <Route element={<Demo data={data} />} path="/demo" />
            </Routes>
            <Box pt={4}>
              <Typography variant="body2" color="textSecondary" align="center">
                Stop searching, start finding.
              </Typography>
            </Box>
          </Container>
        </main>
      </BrowserRouter>
    </div>
  )
}

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    height: '100%',
  },
  appBarSpacer: {
    paddingTop: 64,
  },
  content: {
    flexGrow: 1,
    height: '100vh',
    overflow: 'auto',
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: -drawerWidth,
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
}))
