import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import axios from "axios";
import { useAuth } from "react-oidc-context";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const api = axios.create({
  baseURL: "https://jt23dkziya.execute-api.us-east-2.amazonaws.com/",
  headers: {
    'Content-Type': 'application/json',
  }
});

export default function Dashboard() {
  const auth = useAuth();
  const userEmail = auth.user?.profile?.email;

  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ amount: "", category: "", date: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [editId, setEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to sort transactions by date descending
  const sortByDateDesc = (arr) =>
    arr.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

  // Fetch transactions when component mounts or email changes
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userEmail) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching transactions for:', userEmail);
        const response = await api.get(`/transactions?email=${encodeURIComponent(userEmail)}`);
        console.log('Received transactions:', response.data);
        setTransactions(sortByDateDesc(response.data));
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [userEmail]);

  // Loading state
  if (auth.isLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl">Loading transactions...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl text-red-600">{error}</p>
      </div>
    );
  }

  // Not authenticated state
  if (!auth.isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl">Please sign in to view your transactions.</p>
      </div>
    );
  }

  const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
  const balance = income + expenses;

  const categoryData = Object.entries(
    transactions
      .filter(t => t.amount < 0)
      .reduce((acc, t) => {
        const key = t.category || "Other";
        acc[key] = acc[key] || 0;
        acc[key] += Math.abs(t.amount);
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

  // Add transaction handler (now handles both add and edit)
  const addOrEditTransaction = async (e) => {
    e.preventDefault();
    if (!userEmail) return;
    let amt = Math.abs(parseFloat(form.amount));
    if (form.category !== "Salary") amt = -amt;
    const transactionData = {
      id: editId || Date.now().toString(),
      amount: amt,
      category: form.category,
      date: form.date,
    };
    try {
      if (editId) {
        await api.patch(`/transactions`, { ...transactionData, email: userEmail });
        setTransactions(sortByDateDesc(transactions.map(tx => tx.id === editId ? transactionData : tx)));
        setEditId(null);
      } else {
        await api.post("/transactions", { ...transactionData, email: userEmail });
        setTransactions(sortByDateDesc([transactionData, ...transactions]));
      }
      setForm({ amount: "", category: "", date: "" });
    } catch (err) {
      alert("Failed to save transaction. Check console for details.");
      console.error(err);
    }
  };

  // Delete transaction handler
  const deleteTransaction = async (id) => {
    if (!userEmail) return;
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await api.delete(`/transactions`, { data: { id, email: userEmail } });
      setTransactions(sortByDateDesc(transactions.filter(tx => tx.id !== id)));
    } catch (err) {
      alert("Failed to delete transaction. Check console for details.");
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-400 to-teal-600 text-white">
      <div className="bg-white text-black p-6 rounded-xl shadow-md max-w-4xl w-full text-center">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        
        {/* Add Transaction Form */}
        <form onSubmit={addOrEditTransaction} className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-4 justify-center">
            <input
              type="number"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="px-3 py-2 border rounded"
              min="0.01"
              step="0.01"
              required
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 border rounded"
              required
            >
              <option value="" disabled>Select Category</option>
              <option value="Food">Food</option>
              <option value="Rent">Rent</option>
              <option value="Utilities">Utilities</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Travel">Travel</option>
              <option value="Shopping">Shopping</option>
              <option value="Health">Health</option>
              <option value="Salary">Salary</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="px-3 py-2 border rounded"
              required
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
              {editId ? "Update Transaction" : "Add Transaction"}
            </button>
          </div>
        </form>

        {/* Summary Section */}
        <div className="mb-6">
          <p className="mb-2">Income: ${income.toFixed(2)}</p>
          <p className="mb-2">Expenses: ${Math.abs(expenses).toFixed(2)}</p>
          <p className="font-semibold">Balance: ${balance.toFixed(2)}</p>
        </div>

        {/* Pie Chart and Table Side by Side */}
        <div className="flex flex-col md:flex-row gap-8 justify-between items-start">
          {/* Expense Breakdown Chart */}
          {categoryData.length > 0 && (
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-4">Expense Breakdown</h2>
              <PieChart width={300} height={300} className="mx-auto">
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </div>
          )}

          {/* Transactions Table */}
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left bg-white text-black border">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Category</th>
                    <th className="border px-2 py-1">Amount</th>
                    <th className="border px-2 py-1">Date</th>
                    <th className="border px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice((currentPage - 1) * 5, currentPage * 5).map((t) => (
                    <tr key={t.id}>
                      <td className="border px-2 py-1">{t.category}</td>
                      <td className={`border px-2 py-1 ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${Math.abs(t.amount).toFixed(2)}
                      </td>
                      <td className="border px-2 py-1">{t.date}</td>
                      <td className="border px-2 py-1 space-x-2">
                        <button
                          type="button"
                          className="bg-yellow-500 text-white px-2 py-1 rounded"
                          onClick={() => {
                            setForm({ amount: Math.abs(t.amount), category: t.category, date: t.date });
                            setEditId(t.id);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="bg-red-600 text-white px-2 py-1 rounded"
                          onClick={() => deleteTransaction(t.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="mt-2 flex justify-between">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="bg-gray-300 text-black px-3 py-1 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={currentPage * 5 >= transactions.length}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="bg-gray-300 text-black px-3 py-1 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}