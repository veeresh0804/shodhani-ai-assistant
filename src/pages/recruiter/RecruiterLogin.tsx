import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RecruiterLogin: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/recruiter/dashboard', { replace: true }); }, [navigate]);
  return null;
};

export default RecruiterLogin;
