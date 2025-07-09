import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function SignUp() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.email) {
          throw new Error(data.email[0]);
        } else if (data.username) {
          throw new Error(data.username[0]);
        } else if (data.password) {
          throw new Error(data.password[0]);
        }
        throw new Error(data.error || 'Sign up failed');
      }

      // If successful, navigate to sign in page
      navigate('/signin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Sign up error:', err);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="mt-2 text-center text-2xl font-semibold tracking-tight text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              and start exploring with Tipsiti
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-md bg-red-50 text-red-500 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <div className="mt-1">
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-200"
              >
                Create account
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 