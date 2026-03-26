import { createContext, useContext, useState } from 'react';

const PendingFileContext = createContext(null);

export const PendingFileProvider = ({ children }) => {
    const [pendingFile, setPendingFile] = useState(null);
    const [pendingTitle, setPendingTitle] = useState('');

    return (
        <PendingFileContext.Provider value={{ pendingFile, setPendingFile, pendingTitle, setPendingTitle }}>
            {children}
        </PendingFileContext.Provider>
    );
};

export const usePendingFile = () => useContext(PendingFileContext);