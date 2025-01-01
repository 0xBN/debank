import { useEffect, useState } from 'react';
import useBalances from '../hooks/useBalances';

export default function Home() {
  const [addresses, setAddresses] = useState('');
  const { results, fetchBalances, calculateTotal, loading, finished, error } =
    useBalances();

  // Load addresses from localStorage on component mount
  useEffect(() => {
    const savedAddresses = localStorage.getItem('debank-addresses');
    if (savedAddresses) {
      setAddresses(savedAddresses);
    }
  }, []);

  // Save addresses to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('debank-addresses', addresses);
  }, [addresses]);

  const handleFetch = () => {
    const addressList = addresses
      .split('\n')
      .map((addr) => addr.trim())
      .filter((addr) => addr !== '');
    fetchBalances(addressList);
  };

  return (
    <div className='min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-6'>
      <div className='max-w-3xl w-full'>
        <h1 className='text-3xl font-extrabold mb-6 text-center'>
          DeBank Balance Fetcher
        </h1>
        <textarea
          rows={8}
          value={addresses}
          onChange={(e) => setAddresses(e.target.value)}
          placeholder='Enter 0x addresses, one per line'
          className='w-full p-4 mb-4 bg-gray-800 text-gray-100 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono'
        />
        <button
          onClick={handleFetch}
          className={`w-full py-2 text-lg rounded-md font-bold ${
            loading
              ? 'bg-gray-700 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={loading}
        >
          {loading ? 'Fetching...' : 'Get Balances'}
        </button>

        {error && <p className='text-red-500 mt-4'>{error}</p>}

        {results.length > 0 && (
          <div className='mt-8'>
            <h2 className='text-xl font-bold mb-4 text-center'>Results</h2>
            <table className='w-full border-collapse border border-gray-700 text-sm'>
              <thead>
                <tr>
                  <th className='border border-gray-700 p-2 text-left'>
                    Address
                  </th>
                  <th className='border border-gray-700 p-2 text-left'>
                    Balance
                  </th>
                  <th className='border border-gray-700 p-2 text-left'>
                    Percentage Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td className='border border-gray-700 p-2 break-words'>
                      {result.address}
                    </td>
                    <td className='border border-gray-700 p-2'>
                      {result.balance === 'Loading...' ? (
                        <span className='animate-pulse text-gray-400'>
                          Loading...
                        </span>
                      ) : (
                        result.balance
                      )}
                    </td>
                    <td className='border border-gray-700 p-2'>
                      {result.percentageChange === 'Loading...' ? (
                        <span className='animate-pulse text-gray-400'>
                          Loading...
                        </span>
                      ) : (
                        result.percentageChange || 'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className='mt-4 font-bold text-center text-lg'>
              {finished ? 'Total Balance' : 'Balance So Far'}: $
              {calculateTotal().toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
