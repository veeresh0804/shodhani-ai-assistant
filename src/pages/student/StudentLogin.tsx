import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentLogin: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/student/dashboard', { replace: true }); }, [navigate]);
  return null;
};

export default StudentLogin;
