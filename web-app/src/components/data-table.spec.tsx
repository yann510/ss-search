import { fireEvent, render, screen } from '@testing-library/react'
import DataTable from './data-table'
import { Data } from '../models/data'

const createRows = (count: number): Data[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${index + 1}`,
    name: `Name ${index + 1}`,
    age: 20 + index,
    address: `Address ${index + 1}`,
  }))

describe('DataTable', () => {
  it('moves back to an available page when data shrinks', () => {
    const allRows = createRows(25)
    const { rerender } = render(<DataTable data={allRows} searchWords={[]} />)

    fireEvent.click(screen.getByLabelText(/go to next page/i))

    expect(screen.getByText('Name 11')).toBeTruthy()

    rerender(<DataTable data={allRows.slice(0, 5)} searchWords={[]} />)

    expect(screen.getByText('Name 1')).toBeTruthy()
    expect(screen.queryByText('Name 11')).toBeNull()
  })
})
