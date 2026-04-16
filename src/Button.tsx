import { useEffect } from "react"

function Button(){
    
    const btn = () => {
        prompt("Hello World")
    }
    return (

        <button onClick={btn}>Click!</button>
    )
}

export default Button