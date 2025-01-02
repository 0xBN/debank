import { useEffect, useState } from 'react';
import useBalances from '../hooks/useBalances';

export default function Home() {
  const [addresses, setAddresses] = useState('');
  const [fetchStartTime, setFetchStartTime] = useState<number | null>(null);
  const [currentFetchDuration, setCurrentFetchDuration] = useState(0);
  const [lastFetchDuration, setLastFetchDuration] = useState<number | null>(
    null
  );
  const [previousResults, setPreviousResults] = useState([]);
  const [previousFetchTime, setPreviousFetchTime] = useState<string | null>(
    null
  );
  const { results, fetchBalances, calculateTotal, loading, finished, error } =
    useBalances();

  // Load addresses, previous results, and last fetch duration from localStorage on mount
  useEffect(() => {
    const savedAddresses = localStorage.getItem('debank-addresses');
    const savedPreviousResults = localStorage.getItem(
      'debank-previous-results'
    );
    const savedLastFetchDuration = localStorage.getItem(
      'debank-last-fetch-duration'
    );
    const savedPreviousFetchTime = localStorage.getItem(
      'debank-previous-fetch-time'
    );

    if (savedAddresses) setAddresses(savedAddresses);
    if (savedPreviousResults)
      setPreviousResults(JSON.parse(savedPreviousResults));
    if (savedLastFetchDuration)
      setLastFetchDuration(Number(savedLastFetchDuration));
    if (savedPreviousFetchTime) setPreviousFetchTime(savedPreviousFetchTime);
  }, []);

  // Save addresses to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('debank-addresses', addresses);
  }, [addresses]);

  // Save results and fetch time to localStorage when fetch finishes
  useEffect(() => {
    if (finished) {
      const now = new Date().toLocaleString();
      localStorage.setItem('debank-previous-results', JSON.stringify(results));
      localStorage.setItem('debank-previous-fetch-time', now);
      setPreviousResults(results);
      setPreviousFetchTime(now);
    }
  }, [finished, results]);

  // Start the timer when a fetch begins
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (loading) {
      setFetchStartTime(Date.now());
      setCurrentFetchDuration(0);

      // Update the timer every second
      timer = setInterval(() => {
        setCurrentFetchDuration(
          Math.floor((Date.now() - (fetchStartTime || 0)) / 1000)
        );
      }, 1000);
    } else if (fetchStartTime) {
      // When the fetch finishes, calculate and save the duration
      const duration = Math.floor((Date.now() - fetchStartTime) / 1000);
      setLastFetchDuration(duration);
      localStorage.setItem('debank-last-fetch-duration', String(duration));
      setFetchStartTime(null);
      setCurrentFetchDuration(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loading, fetchStartTime]);

  const handleFetch = () => {
    const addressList = addresses
      .split('\n')
      .map((addr) => addr.trim())
      .filter((addr) => addr !== '');
    fetchBalances(addressList);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
                      <span title={result.address}>
                        {truncateAddress(result.address)}
                      </span>
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

        {/* Timer Section */}
        <div className='mt-4 text-center'>
          {loading && (
            <p className='text-gray-400'>
              Fetching data... {currentFetchDuration}s elapsed
            </p>
          )}
          {!loading && lastFetchDuration !== null && (
            <p className='text-gray-400'>
              Last fetch took {lastFetchDuration}s
            </p>
          )}
        </div>

        {/* Previous Results Section */}
        {previousResults.length > 0 && (
          <div className='mt-8'>
            <h2 className='text-xl font-bold mb-4 text-center'>
              Previous Results
            </h2>
            <p className='text-sm text-gray-400 text-center mb-4'>
              Last fetched at: {previousFetchTime || 'N/A'}
            </p>
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
                {previousResults.map((result, index) => (
                  <tr key={index}>
                    <td className='border border-gray-700 p-2 break-words'>
                      <span title={result.address}>
                        {truncateAddress(result.address)}
                      </span>
                    </td>
                    <td className='border border-gray-700 p-2'>
                      {result.balance}
                    </td>
                    <td className='border border-gray-700 p-2'>
                      {result.percentageChange || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
