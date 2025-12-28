import { useState } from 'react'

function Greeter() {
  // 1. STATE: Where we store the data
  const [personName, setPersonName] = useState("")

  // 2. LOGIC: The function that runs on click
  const handleGreeting = () => {
    // Note the Template Literal syntax we learned
    alert(`Hello ${personName}`)
  }

  // 3. UI: The HTML
  return (
    <div>
      {/* CONTROLLED INPUT:
         value={...}  -> The box shows the variable
         onChange={...} -> Typing updates the variable
      */}
      <input 
        type="text" 
        value={personName}
        onChange={(e) => setPersonName(e.target.value)} 
      />

      <button onClick={handleGreeting}>Say Hi</button>
    </div>
  )
}
export default Greeter