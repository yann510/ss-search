import * as React from 'react'
import { Backdrop, CircularProgress } from '@mui/material'
import { makeStyles } from 'tss-react/mui'

interface Props {
  isLoading: boolean
  text: string
}

export function BackdropProgress(props: Props) {
  const { classes } = useStyles()
  const { isLoading, text } = props

  return (
    <Backdrop className={classes.backdrop} open={isLoading}>
      <div className={classes.backdropContent}>
        <CircularProgress className={classes.circularProgress} color="inherit" />
        <span>{text}</span>
      </div>
    </Backdrop>
  )
}

const useStyles = makeStyles()((theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
  backdropContent: {
    display: 'grid',
    gridTemplateRows: '50px 70px',
  },
  circularProgress: {
    placeSelf: 'center',
  },
}))
