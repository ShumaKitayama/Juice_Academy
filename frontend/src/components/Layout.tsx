import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>© 2025 Juice Academy. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout; 