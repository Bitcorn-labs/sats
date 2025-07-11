//import

import { CircularProgress, Paper, TextField } from '@mui/material';
import { useEffect, useState } from 'react';

interface ShowTransactionStatusFieldProps {
  loading: boolean; // Change to the correct type if necessary
  statusArray: string[];
}

const ShowTransactionStatus = ({
  statusArray,
  loading,
}: ShowTransactionStatusFieldProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [height, setHeight] = useState('0px'); // Initially 0px

  useEffect(() => {
    if (statusArray.length > 0) {
      setIsVisible(true); // Make the Paper visible immediately
      setTimeout(() => {
        setHeight('120px'); // After a slight delay, expand to full height
      }, 10); // Delay to ensure initial height is applied
    } else {
      setHeight('0px'); // Collapse height when array is empty
      setTimeout(() => {
        setIsVisible(false); // After the transition, hide the Paper
      }, 500); // Match this delay to the transition duration (500ms)
    }
  }, [statusArray]);

  return (
    <div style={{ margin: '10px', width: '100%' }}>
      <>
        <div
          style={{
            maxHeight: '150px',
            padding: '5px',
            height: expanded
              ? '150px'
              : statusArray.length > 1
              ? 'auto'
              : '0px',
            transition: 'height 0.5s ease-in-out', // Smooth height transition
            overflowY: expanded ? 'auto' : 'hidden',
            textAlign: 'left',
            border: expanded ? '3px solid lightgrey' : '',
          }}
        >
          {expanded ? (
            <>
              {statusArray.map((item, index) => (
                <div key={index}>
                  {item}
                  {loading && index === 0 ? (
                    <>
                      <CircularProgress size={12} />
                    </>
                  ) : null}
                </div>
              ))}
            </>
          ) : (
            <>
              {statusArray.length > 1 ? (
                <>
                  {statusArray[0]}
                  {loading ? (
                    <>
                      <CircularProgress size={12} />
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>
        {statusArray.length > 1 ? (
          <div style={{ display: 'flex' }}>
            <div style={{ width: '0%' }}></div>
            <div style={{ width: '100%' }}>
              <button
                onClick={() => {
                  setExpanded(!expanded);
                }}
                style={{ width: '100%', paddingTop: '16px' }}
              >
                Show/Hide
              </button>
            </div>
          </div>
        ) : (
          <></>
        )}
      </>
    </div>
  );
};

export default ShowTransactionStatus;
