import { useState } from 'react';

export type BalanceResult = {
  address: string;
  balance: string;
  percentageChange: string | null;
};

export default function useBalances() {
  const [results, setResults] = useState<BalanceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');

  const fetchBalancesSequentially = async (addresses: string[]) => {
    setError('');
    setFinished(false);
    setResults(
      addresses.map((address) => ({
        address,
        balance: 'Loading...',
        percentageChange: 'Loading...',
      }))
    );

    if (addresses.length === 0) {
      setError('Please enter at least one valid address.');
      return;
    }

    setLoading(true);

    try {
      for (const address of addresses) {
        try {
          const response = await fetch(`/api/getDebank?address=${address}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch data for address: ${address}`);
          }
          const result = await response.json();

          // Update the result for this address
          setResults((prevResults) =>
            prevResults.map((r) =>
              r.address === address
                ? {
                    address,
                    balance: result.balance,
                    percentageChange: result.percentageChange,
                  }
                : r
            )
          );
        } catch (err) {
          console.warn(`Error fetching address ${address}:`, err);
          setResults((prevResults) =>
            prevResults.map((r) =>
              r.address === address
                ? { address, balance: 'Error', percentageChange: null }
                : r
            )
          );
        }
      }

      // Mark as finished when the last address is processed
      setFinished(true);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      setError('Failed to fetch balances. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () =>
    results.reduce((sum, result) => {
      const balance = parseFloat(result.balance.replace(/[^0-9.-]+/g, '')) || 0;
      return sum + balance;
    }, 0);

  return {
    results,
    fetchBalances: fetchBalancesSequentially,
    calculateTotal,
    loading,
    finished,
    error,
  };
}
