import React from 'react';
import Button from 'components/Button';

export default function ButtonGroup({buttons, style}) {
  return (
    <div
      style={style}
      className='btn-group'
    >
      {buttons.map((button, index) => {
        return (
          <Button
            key={index}
            type="button"
            className={`btn ${button.buttonClass}`}
            onClick={button.onClick}
            disabled={button.disabled}
          >
            {button.label}
          </Button>
        )
      })}
    </div>
  )
}