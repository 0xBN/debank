import { useState } from 'react';

export default function Home() {
  const [addresses, setAddresses] = useState(''); // Stores user-input addresses
  const [results, setResults] = useState<
    { address: string; balance: string; percentageChange: string | null }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch balances for all addresses
  const getTotal = async () => {
    setError('');
    setResults([]);
    const addressList = addresses
      .split('\n')
      .map((addr) => addr.trim())
      .filter((addr) => addr !== '');

    if (addressList.length === 0) {
      setError('Please enter at least one valid address.');
      return;
    }

    setLoading(true);

    try {
      const allResults = await Promise.all(
        addressList.map(async (address) => {
          try {
            const response = await fetch(
              `/api/getBalanceAndChange?address=${address}`
            );
            if (!response.ok) {
              throw new Error(`Failed to fetch data for address: ${address}`);
            }
            const result = await response.json();
            return {
              address,
              balance: result.balance,
              percentageChange: result.percentageChange,
            };
          } catch (err) {
            console.warn(`Error fetching address ${address}:`, err);
            return { address, balance: 'Error', percentageChange: null };
          }
        })
      );

      setResults(allResults);
    } catch (err) {
      setError('Failed to fetch balances. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate the total balance from results
  const calculateTotal = () => {
    return results.reduce((sum, result) => {
      const balance = parseFloat(result.balance.replace(/[^0-9.-]+/g, '')) || 0;
      return sum + balance;
    }, 0);
  };

  return (
    <div className='max-w-4xl mx-auto p-6'>
      <h1 className='text-2xl font-bold mb-4'>DeBank Address Fetcher</h1>
      <p className='mb-4'>Enter 0x addresses (one per line):</p>
      <textarea
        rows={10}
        value={addresses}
        onChange={(e) => setAddresses(e.target.value)}
        placeholder='Enter 0x addresses, one per line'
        className='w-full p-4 mb-4 border rounded-md font-mono'
      />
      <button
        onClick={getTotal}
        className={`px-4 py-2 text-white rounded-md ${
          loading
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        disabled={loading}
      >
        {loading ? 'Fetching...' : 'Get Total'}
      </button>

      {error && <p className='text-red-500 mt-4'>{error}</p>}

      {results.length > 0 && (
        <div className='mt-8'>
          <h2 className='text-xl font-bold mb-4'>Results</h2>
          <table className='w-full border-collapse border border-gray-300'>
            <thead>
              <tr>
                <th className='border border-gray-300 p-2 text-left'>
                  Address
                </th>
                <th className='border border-gray-300 p-2 text-left'>
                  Balance
                </th>
                <th className='border border-gray-300 p-2 text-left'>
                  Percentage Change
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index}>
                  <td className='border border-gray-300 p-2 break-words'>
                    {result.address}
                  </td>
                  <td className='border border-gray-300 p-2'>
                    {result.balance}
                  </td>
                  <td className='border border-gray-300 p-2'>
                    {result.percentageChange || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className='mt-4 font-bold'>
            Total Balance: ${calculateTotal().toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
