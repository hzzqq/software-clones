import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField } from '@mui/material';
import { copyToClipboard } from '../../utils/format';

const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT', 'INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'JOIN',
  'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP BY', 'ORDER BY',
  'HAVING', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'UNION', 'ALL',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'BETWEEN', 'IN', 'LIKE',
];

/** Lightweight SQL pretty-printer (uppercases keywords, breaks lines). */
export default function SqlFormatTool(): JSX.Element {
  const [input, setInput] = useState<string>(
    "select id,name from users where age>18 and status='active' order by created_at desc limit 10"
  );
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const format = (): void => {
    if (!input.trim()) {
      setError('请输入 SQL');
      setOutput('');
      return;
    }
    setError('');
    let sql = ` ${input.replace(/\s+/g, ' ').trim()} `;
    for (const kw of KEYWORDS) {
      const re = new RegExp(`\\s${kw.replace(/ /g, '\\s')}\\s`, 'gi');
      sql = sql.replace(re, `\n${kw}\n`);
    }
    sql = sql
      .replace(/\s*,\s*/g, ',\n  ')
      .replace(/\n{2,}/g, '\n')
      .trim();
    setOutput(sql);
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="SQL 输入"
        multiline
        minRows={5}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="mono"
      />
      <Button variant="contained" onClick={format} disabled={!input}>
        格式化
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
      {output && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TextField
            multiline
            minRows={5}
            fullWidth
            value={output}
            InputProps={{ readOnly: true }}
            className="mono"
          />
          <Button size="small" sx={{ mt: 1 }} onClick={() => void copyToClipboard(output)}>
            复制
          </Button>
        </Paper>
      )}
    </Stack>
  );
}
