import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import axios from "axios";
import { useAuth } from "react-oidc-context";
import { Card, Button, Table, Statistic, Row, Col, message } from 'antd';

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const api = axios.create({
  baseURL: "insert api url here",
  headers: {
    'Content-Type': 'application/json',
  }
});

export default function Dashboard() {
  const auth = useAuth();
  const userEmail = auth.user?.profile?.email;

  // New state for selected category filter from pie chart
  const [selectedCategory, setSelectedCategory] = useState(null);
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
        const response = await api.get(`/transactions?email=${encodeURIComponent(userEmail)}`);
        setTransactions(sortByDateDesc(response.data));
      } catch (err) {
        setError('Failed to load transactions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, [userEmail]);

  if (auth.isLoading || isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
        <div style={{ fontSize: 24, color: '#1677ff', fontWeight: 600 }}>Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
        <Card style={{ color: '#cf1322', fontSize: 18 }}>{error}</Card>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
        <Card style={{ color: '#1677ff', fontSize: 18 }}>Please sign in to view your transactions.</Card>
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

  // Derived array: either all transactions or only those matching selectedCategory
  const filteredTransactions = selectedCategory
    ? transactions.filter(t => t.category === selectedCategory)
    : transactions;

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
        message.success('Transaction updated!');
      } else {
        await api.post("/transactions", { ...transactionData, email: userEmail });
        setTransactions(sortByDateDesc([transactionData, ...transactions]));
        message.success('Transaction added!');
      }
      setForm({ amount: "", category: "", date: "" });
    } catch (err) {
      message.error("Failed to save transaction. Check console for details.");
    }
  };

  const deleteTransaction = async (id) => {
    if (!userEmail) return;
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await api.delete(`/transactions`, { data: { id, email: userEmail } });
      setTransactions(sortByDateDesc(transactions.filter(tx => tx.id !== id)));
      message.success('Transaction deleted!');
    } catch (err) {
      message.error("Failed to delete transaction. Check console for details.");
    }
  };

  // Ant Design Table columns
  const columns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt) => (
        <span style={{ color: amt < 0 ? '#cf1322' : '#3f8600', fontWeight: 600 }}>
          {amt < 0 ? '-' : '+'}${Math.abs(amt).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, t) => (
        <>
          <Button
            type="link"
            onClick={() => {
              setForm({ amount: Math.abs(t.amount), category: t.category, date: t.date });
              setEditId(t.id);
            }}
          >Edit</Button>
          <Button type="link" danger onClick={() => deleteTransaction(t.id)}>Delete</Button>
        </>
      ),
    },
  ];

  return (
    <div style={{ background: '#f5f6fa', minHeight: '100vh', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>Finance 💵 Tracker</div>
        <Button 
          type="primary" 
          size="large" 
          style={{ fontWeight: 600 }}
          danger
          onClick={() => {
            if (auth.removeUser) auth.removeUser();
            if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
              window.location.href = '/';
            }
          }}
        >
          Sign Out
        </Button>
      </div>

      {/* Add Transaction Form */}
      <Card style={{ marginBottom: 24 }}>
        <form onSubmit={addOrEditTransaction} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
          <input
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #d9d9d9' }}
            min="0.01"
            step="0.01"
            required
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #d9d9d9' }}
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
            style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #d9d9d9' }}
            required
          />
          <Button
            type={editId ? "default" : "primary"}
            htmlType="submit"
            style={{ fontWeight: 600, minWidth: 140 }}
          >
            {editId ? "Update" : "Add"}
          </Button>
        </form>
      </Card>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Total Income" value={income} precision={2} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Total Expenses" value={Math.abs(expenses)} precision={2} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Net Balance" value={balance} precision={2} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={16} align="stretch">
        <Col xs={24} md={12}>
          <Card
            title="Expense Breakdown"
            style={{ marginBottom: 24, height: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            bodyStyle={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 0 }}
          >
            <div style={{ width: '100%', height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <PieChart width={380} height={380}>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  fill="#8884d8"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      cursor="pointer"
                      onClick={() => setSelectedCategory(entry.name)}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title="Recent Transactions"
            style={{ marginBottom: 24 }}
          >
            {/* Show clear filter button if a category is selected */}
            {selectedCategory && (
              <div style={{ marginBottom: 12 }}>
                <Button type="link" onClick={() => {
                  setSelectedCategory(null);
                  setCurrentPage(1);
                }}>
                  Clear filter: {selectedCategory}
                </Button>
              </div>
            )}
            {/* Optionally display a small message about filtering */}
            {selectedCategory && (
              <div style={{ marginBottom: 12, fontStyle: 'italic', color: '#555' }}>
                Showing only {selectedCategory} transactions
              </div>
            )}
            <Table
              dataSource={filteredTransactions.slice((currentPage - 1) * 5, currentPage * 5)}
              columns={columns}
              pagination={false}
              rowKey="id"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                style={{ marginRight: 8 }}
              >
                Prev
              </Button>
              <Button
                disabled={currentPage * 5 >= filteredTransactions.length}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}