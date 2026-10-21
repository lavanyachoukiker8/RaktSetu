import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { RED_SHADES } from '../utils/constants';

const axis = { fontSize: 12, fill: '#6B0F1A' };
const tip = { borderRadius: 12, border: '1px solid #FFC2C8', color: '#3D0810' };

/** type: 'bar' | 'line' | 'donut'. Uses graded red shades only. */
export default function StarterChart({ type = 'bar', data = [], xKey = 'name', yKey = 'value', height = 260, label = 'Chart' }) {
  const summary = `${label}: ${data.map((d) => `${d[xKey]} ${d[yKey]}`).join(', ')}`;
  return (
    <div style={{ width: '100%', height }} role="img" aria-label={summary}>
      <ResponsiveContainer>
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#FFE0E3" vertical={false} />
            <XAxis dataKey={xKey} tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tip} />
            <Line type="monotone" dataKey={yKey} stroke="#D62839" strokeWidth={3} dot={{ r: 4, fill: '#8E1422', stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        ) : type === 'donut' ? (
          <PieChart>
            <Pie data={data} dataKey={yKey} nameKey={xKey} innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="#fff">
              {data.map((_, i) => (
                <Cell key={i} fill={['#6B0F1A', '#E63946', '#FF97A1', '#B71C2C'][i % 4]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tip} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#6B0F1A' }} />
          </PieChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#FFE0E3" vertical={false} />
            <XAxis dataKey={xKey} tick={axis} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={axis} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tip} cursor={{ fill: '#FFF1F2' }} />
            <Bar dataKey={yKey} radius={[8, 8, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={RED_SHADES[(i % RED_SHADES.length)]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
