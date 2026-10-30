import React, { createContext, useState, useContext } from 'react';

const CompanyContext = createContext();

export const CompanyProvider = ({ children }) => {
    const [companyInfo, setCompanyInfo] = useState({
        name: 'LogKaro Fleet',
        primaryColor: '#0284c7',
        accentColor: '#10b981',
    });

    return (
        <CompanyContext.Provider value={{ companyInfo, setCompanyInfo }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => useContext(CompanyContext);
