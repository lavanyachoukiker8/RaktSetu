import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Clock, AlertTriangle, AlertOctagon, Send } from 'lucide-react';
import { FormInput, FormSelect, FormTextarea } from './Forms';
import { ConfirmDialog } from './Modal';
import { api } from '../api';
import { attempt } from '../utils/notify';
import { BLOOD_GROUPS, CITIES } from '../utils/constants';
import { toInputDateTime } from '../utils/helpers';
import toast from 'react-hot-toast';

const CHIPS = [
  { v: 'NORMAL', label: 'Normal', Icon: Clock, cls: 'peer-checked:bg-red-100 peer-checked:border-red-500 peer-checked:text-red-900', hint: 'Within a few days' },
  { v: 'URGENT', label: 'Urgent', Icon: AlertTriangle, cls: 'peer-checked:bg-red-300 peer-checked:border-red-700 peer-checked:text-red-950', hint: 'Within 24 hours' },
  { v: 'CRITICAL', label: 'Critical', Icon: AlertOctagon, cls: 'peer-checked:bg-red-700 peer-checked:border-red-900 peer-checked:text-white', hint: 'Immediately' },
];

const defaultDeadline = () => toInputDateTime(new Date(Date.now() + 24 * 3600000));

/** Shared by the public Emergency page and the hospital "Create Request" tab. */
export default function RequestForm({ hospital = null, onCreated }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const {
    register, handleSubmit, watch, reset, formState: { errors },
  } = useForm({
    mode: 'onTouched',
    defaultValues: {
      patientName: '', group: '', units: 1, urgency: 'URGENT', requiredBy: defaultDeadline(),
      contactPerson: hospital?.contactPerson || '', phone: hospital?.phone || '', notes: '', hospitalName: '', city: '',
    },
  });
  const urgency = watch('urgency');

  const submit = async (values) => {
    setBusy(true);
    const res = await attempt(() => api.createRequest({ ...values, hospitalId: hospital?.id || null }));
    setBusy(false);
    setConfirm(false);
    if (res.ok) {
      const n = res.data.autoNotified;
      toast.success(n ? `Request ${res.data.id} raised. ${n} matching donor(s) notified automatically.` : `Request ${res.data.id} raised successfully.`);
      reset();
      onCreated?.(res.data);
    }
  };

  const onValid = (values) => {
    if (values.urgency === 'CRITICAL') {
      setPending(values);
      setConfirm(true);
    } else submit(values);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onValid)} className="card space-y-5 p-5 sm:p-6" noValidate>
        {!hospital && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Hospital / location name" required placeholder="e.g. City Hospital, Adajan" error={errors.hospitalName?.message}
              {...register('hospitalName', { required: 'Hospital name is required' })} />
            <FormSelect label="City" required placeholder="Select city" options={CITIES} error={errors.city?.message}
              {...register('city', { required: 'Please select a city' })} />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Patient name" required placeholder="Full name of the patient" error={errors.patientName?.message}
            {...register('patientName', { required: 'Patient name is required' })} />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Blood group" required placeholder="Select" options={BLOOD_GROUPS} error={errors.group?.message}
              {...register('group', { required: 'Select a blood group' })} />
            <FormInput label="Units needed" type="number" required helper="1 to 10 units" error={errors.units?.message}
              {...register('units', { required: 'Enter units', valueAsNumber: true, min: { value: 1, message: 'Minimum 1 unit' }, max: { value: 10, message: 'Maximum 10 units' } })} />
          </div>
        </div>

        <fieldset>
          <legend className="label">Urgency</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {CHIPS.map(({ v, label, Icon, cls, hint }) => (
              <label key={v} className="cursor-pointer">
                <input type="radio" value={v} className="peer sr-only" {...register('urgency')} />
                <span className={`flex items-center gap-2 rounded-xl border-2 border-red-200 bg-white px-3 py-2.5 text-sm font-bold text-red-800 transition peer-focus-visible:ring-2 peer-focus-visible:ring-red-500 ${cls}`}>
                  <Icon size={18} aria-hidden="true" />
                  <span>
                    {label}
                    <span className="block text-xs font-medium opacity-80">{hint}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormInput label="Required by" type="datetime-local" required error={errors.requiredBy?.message}
            {...register('requiredBy', { required: 'Choose a date and time', validate: (v) => new Date(v) > new Date(Date.now() - 60000) || 'Time must be in the future' })} />
          <FormInput label="Contact person" required error={errors.contactPerson?.message}
            {...register('contactPerson', { required: 'Contact person is required' })} />
          <FormInput label="Contact phone" required inputMode="numeric" maxLength={10} placeholder="10-digit mobile" error={errors.phone?.message}
            {...register('phone', { required: 'Phone is required', pattern: { value: /^\d{10}$/, message: 'Phone must be exactly 10 digits' } })} />
        </div>
        <FormTextarea label="Notes (optional)" placeholder="Ward, doctor, any special instructions…" {...register('notes')} />

        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={busy}>
          <Send size={16} aria-hidden="true" /> {busy ? 'Raising request…' : urgency === 'CRITICAL' ? 'Raise CRITICAL request' : 'Raise request'}
        </button>
      </form>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => submit(pending)}
        loading={busy}
        title="Confirm CRITICAL request"
        confirmText="Yes, raise critical request"
        message="Critical requests instantly notify every matching donor in the city. Please use this only for life-threatening, time-sensitive needs."
      />
    </>
  );
}
