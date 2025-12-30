'use client';

import { useState, useEffect } from 'react';
import { userApi, helloApi } from '@/lib/api';
import type { User } from '@/models/User';

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '' });
  const [message, setMessage] = useState('');

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const response = await userApi.getAll();
    if (response.success && response.data) {
      setUsers(response.data);
    }
    setLoading(false);
  };



  const handleDeleteUser = async (id: number) => {
    const response = await userApi.delete(id.toString());
    if (response.success) {
      setMessage('User deleted successfully!');
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(`Error: ${response.error}`);
    }
  };

  const testHelloApi = async () => {
    const response = await helloApi.get();
    if (response.success && response.data) {
      setMessage(`API says: ${response.data.message}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Gepperdy
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-6">
            Next.js + API Backend + Tailwind CSS
          </p>
          <button
            onClick={testHelloApi}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Test API Connection
          </button>
        </header>

        {/* Message Toast */}
        {message && (
          <div className="mb-6 max-w-2xl mx-auto">
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md">
              {message}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Add User Form */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              Add New User
            </h2>
            <form onSubmit={() => {}} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="john@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Create User
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Users
              </h2>
              <button
                onClick={fetchUsers}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                No users yet. Add one to get started!
              </p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all bg-slate-50 dark:bg-slate-700/50"
                  >
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {user.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* API Documentation */}
        <div className="mt-12 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            API Endpoints
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <code className="text-sm text-green-600 dark:text-green-400 font-semibold">
                  GET /api/users
                </code>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Fetch all users
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <code className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
                  POST /api/users
                </code>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Create a new user
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <code className="text-sm text-green-600 dark:text-green-400 font-semibold">
                  GET /api/users/[id]
                </code>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Get user by ID
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <code className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold">
                  PUT /api/users/[id]
                </code>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Update user by ID
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <code className="text-sm text-red-600 dark:text-red-400 font-semibold">
                  DELETE /api/users/[id]
                </code>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Delete user by ID
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <code className="text-sm text-green-600 dark:text-green-400 font-semibold">
                  GET /api/hello
                </code>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Simple hello endpoint
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
