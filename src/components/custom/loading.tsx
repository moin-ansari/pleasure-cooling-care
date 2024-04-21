import React from 'react'
import { AiOutlineReload } from "react-icons/ai";

const Loading = (params:{label : string}) => {
  return (
    <div className='flex items-center gap-2'>
        <AiOutlineReload className="mr-2 h-4 w-4 animate-spin" />
        <span>{params.label}</span>
    </div>
  )
}

export default Loading