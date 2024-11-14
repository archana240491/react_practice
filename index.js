import React, {useState} from 'react'
import HistoryItem from './HistoryItem'

const BrowserHistory = ({initialHistoryList}) => {
  const [searchInput, setSearchInput] = useState('')
  const [historyItems, setHistoryItems] = useState(initialHistoryList)

  const handleInputChange = event => {
    setSearchInput(event.target.value)
  }

  const handleDelete = id => {
    setHistoryItems(prevItems => prevItems.filter(item => item.id !== id))
  }

  const HistoryItem = ({title, url, onDelete}) => (
    <li>
      <p>{title}</p>
      <p>{url}</p>
      <button onClick={onDelete}>Delete</button>
    </li>
  )

  const filteredHistoryItems = historyItems.filter(
    item =>
      item.title.toLowerCase().includes(searchInput.toLowerCase()) ||
      item.domainUrl.toLowerCase().includes(searchInput.toLowerCase()),
  )

  return (
    <div className="browser-history">
      <input
        type="text"
        value={searchInput}
        onChange={handleInputChange}
        placeholder="Search history"
      />
      <ul>
        {filteredHistoryItems.length > 0 ? (
          filteredHistoryItems.map(item => (
            <HistoryItem
              key={item.id}
              title={item.title}
              url={item.domainUrl}
              onDelete={() => handleDelete(item.id)}
            />
          ))
        ) : (
          <p>No history found</p>
        )}
      </ul>
    </div>
  )
}

export default BrowserHistory
