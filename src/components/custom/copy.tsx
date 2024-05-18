// src/CopyButton.js
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MdContentPaste } from "react-icons/md";

const CopyButton = ({ textToCopy }:any) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000); // Reset the copied state after 2 seconds
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <div>
      <Button variant={'outline'} onClick={handleCopy} className="flex gap-2">
        <MdContentPaste/> {copied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  );
};

export default CopyButton;
