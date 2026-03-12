'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';

interface HistoryEntry {
  id: number;
  expression: string;
  result: string;
  createdAt: string;
}

export default function Home() {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const saveCalculation = async (expr: string, result: string) => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expr, result }),
      });
      await fetchHistory();
    } catch (e) {
      console.error('Failed to save calculation', e);
    }
  };

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(prev => prev === '0' ? digit : prev + digit);
    }
  }, [waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(prev => prev + '.');
    }
  }, [waitingForOperand, display]);

  const calculate = (a: number, op: string, b: number): number | 'Error' => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/':
        if (b === 0) return 'Error';
        return a / b;
      default: return b;
    }
  };

  const handleOperator = useCallback((op: string) => {
    const current = parseFloat(display);

    if (pendingOperator && !waitingForOperand) {
      const result = calculate(pendingValue ?? current, pendingOperator, current);
      if (result === 'Error') {
        setDisplay('Error');
        setExpression('');
        setPendingOperator(null);
        setPendingValue(null);
        setWaitingForOperand(true);
        return;
      }
      const resultStr = formatNumber(result);
      setDisplay(resultStr);
      setExpression(resultStr + ' ' + opSymbol(op));
      setPendingValue(result);
    } else {
      setPendingValue(current);
      setExpression(display + ' ' + opSymbol(op));
    }

    setPendingOperator(op);
    setWaitingForOperand(true);
  }, [display, pendingOperator, pendingValue, waitingForOperand]);

  const handleEquals = useCallback(async () => {
    if (!pendingOperator || pendingValue === null) return;

    const current = parseFloat(display);
    const result = calculate(pendingValue, pendingOperator, current);
    const fullExpression = expression + ' ' + display;

    if (result === 'Error') {
      setDisplay('Error');
      setExpression('');
      setPendingOperator(null);
      setPendingValue(null);
      setWaitingForOperand(true);
      await saveCalculation(fullExpression, 'Error');
      return;
    }

    const resultStr = formatNumber(result);
    setDisplay(resultStr);
    setExpression('');
    setPendingOperator(null);
    setPendingValue(null);
    setWaitingForOperand(true);

    await saveCalculation(fullExpression, resultStr);
  }, [pendingOperator, pendingValue, display, expression]);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setPendingOperator(null);
    setPendingValue(null);
    setWaitingForOperand(false);
  }, []);

  const handleToggleSign = useCallback(() => {
    if (display === 'Error') return;
    const val = parseFloat(display);
    setDisplay(formatNumber(-val));
  }, [display]);

  const handlePercent = useCallback(() => {
    if (display === 'Error') return;
    const val = parseFloat(display);
    setDisplay(formatNumber(val / 100));
  }, [display]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') inputDigit(e.key);
      else if (e.key === '.') inputDecimal();
      else if (e.key === '+') handleOperator('+');
      else if (e.key === '-') handleOperator('-');
      else if (e.key === '*') handleOperator('*');
      else if (e.key === '/') { e.preventDefault(); handleOperator('/'); }
      else if (e.key === 'Enter' || e.key === '=') handleEquals();
      else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') handleClear();
      else if (e.key === 'Backspace') {
        setDisplay(prev => {
          if (prev === 'Error' || prev.length <= 1) return '0';
          return prev.slice(0, -1) || '0';
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputDigit, inputDecimal, handleOperator, handleEquals, handleClear]);

  const formatNumber = (n: number): string => {
    if (isNaN(n) || !isFinite(n)) return 'Error';
    const str = n.toString();
    if (str.length > 12) {
      return parseFloat(n.toPrecision(10)).toString();
    }
    return str;
  };

  const opSymbol = (op: string) => {
    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      case '/': return '÷';
      default: return op;
    }
  };

  const displayFontSize = display.length > 10 ? '1.5rem' : display.length > 7 ? '2rem' : '2.5rem';

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.calculator}>
          <div className={styles.display}>
            <div className={styles.expression}>{expression || '\u00a0'}</div>
            <div className={styles.current} style={{ fontSize: displayFontSize }}>
              {display}
            </div>
          </div>

          <div className={styles.buttons}>
            {/* Row 1 */}
            <button className={`${styles.btn} ${styles.btnFunction}`} onClick={handleClear}>C</button>
            <button className={`${styles.btn} ${styles.btnFunction}`} onClick={handleToggleSign}>+/−</button>
            <button className={`${styles.btn} ${styles.btnFunction}`} onClick={handlePercent}>%</button>
            <button className={`${styles.btn} ${styles.btnOperator}`} onClick={() => handleOperator('/')}>÷</button>

            {/* Row 2 */}
            <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => inputDigit('7')}>7</button>
            <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => inputDigit('8')}>8</button>
            <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => inputDigit('9')}>9</button>
            <button className={`${styles.btn} ${styles.btnOperator}`} onClick={() => handleOperator('*')}>×</button>

            {/* Row 3 */}
            <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => inputDigit('4')}>4</button>
            <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => inputDigit('5')}>5</button>
            <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => inputDigit('6')}>6</button>
            <button className={`${styles.btn} ${styles.btnOperator}`} onClick={() => handleOperator('-')}>−</button>

            {/* Row 4 */}
            <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => inputDigit('1')}>1</button>
            <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => inputDigit('2')}>2</button>
            <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => inputDigit('3')}>3</button>
            <button className={`${styles.btn} ${styles.btnOperator}`} onClick={() => handleOperator('+')}>+</button>

            {/* Row 5 */}
            <button className={`${styles.btn} ${styles.btnDigit} ${styles.btnZero}`} onClick={() => inputDigit('0')}>0</button>
            <button className={`${styles.btn} ${styles.btnDigit}`} onClick={inputDecimal}>.</button>
            <button className={`${styles.btn} ${styles.btnEquals}`} onClick={handleEquals}>=</button>
          </div>
        </div>

        <div className={styles.history}>
          <div className={styles.historyHeader}>
            <h2>History</h2>
            <button className={styles.refreshBtn} onClick={fetchHistory} disabled={historyLoading}>
              {historyLoading ? '...' : '↻'}
            </button>
          </div>
          {history.length === 0 ? (
            <p className={styles.historyEmpty}>No calculations yet</p>
          ) : (
            <ul className={styles.historyList}>
              {history.map(entry => (
                <li key={entry.id} className={styles.historyItem}>
                  <span className={styles.historyExpression}>{entry.expression}</span>
                  <span className={styles.historyResult}>= {entry.result}</span>
                  <span className={styles.historyTime}>
                    {new Date(entry.createdAt).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
