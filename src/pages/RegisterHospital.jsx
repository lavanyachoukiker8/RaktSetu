import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Hourglass } from 'lucide-react';
import { api } from '../api';
import { FormInput, FormSelect, FormTextarea } from '../components/Forms';
import { CITIES } from '../utils/constants';
import { attempt } from '../utils/notify';

export default function RegisterHospital() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, getValues, formState: { errors } } = useForm({ mode: 'onTouched' });

  const onSubmit = async ({ confirm, ...v }) => {
    setBusy(true);
    const res = await attempt(() => api.registerHospital(v));
    setBusy(false);
    if (res.ok) setDone(true);
  };

  if (done)
    return (
      <div className="container-page max-w-xl py-14">
        <div className="card animate-pop p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700"><Hourglass size={30} aria-hidden="true" /></span>
          <h1 className="mt-4 text-2xl font-extrabold">Pending admin verification</h1>
          <p className="muted mt-2">Thank you! Our team will verify your licence details. You will be able to log in once your hospital is approved.</p>
          <Link to="/" className="btn-primary mt-6">Back to home</Link>
        </div>
      </div>
    );

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-3xl font-extrabold">Register your hospital</h1>
      <p className="muted mb-6">Verified hospitals can raise requests, manage blood stock and record donations.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
        <FormInput className="sm:col-span-2" label="Hospital name" required error={errors.name?.message} {...register('name', { required: 'Hospital name is required' })} />
        <FormInput label="Licence number" required placeholder="e.g. GJ/BB/2020/1234" error={errors.license?.message} {...register('license', { required: 'Licence number is required' })} />
        <FormSelect label="City" required placeholder="Select city" options={CITIES} error={errors.city?.message} {...register('city', { required: 'Select a city' })} />
        <FormTextarea className="sm:col-span-2" label="Address" error={errors.address?.message} {...register('address', { required: 'Address is required' })} />
        <FormInput label="Phone" required inputMode="numeric" maxLength={10} error={errors.phone?.message} {...register('phone', { required: 'Phone is required', pattern: { value: /^\d{10}$/, message: 'Phone must be exactly 10 digits' } })} />
        <FormInput label="Email" type="email" required error={errors.email?.message} {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
        <FormInput className="sm:col-span-2" label="Contact person" required error={errors.contactPerson?.message} {...register('contactPerson', { required: 'Contact person is required' })} />
        <FormInput label="Password" type="password" required helper="At least 6 characters" error={errors.password?.message} {...register('password', { required: 'Choose a password', minLength: { value: 6, message: 'At least 6 characters' } })} />
        <FormInput label="Confirm password" type="password" required error={errors.confirm?.message} {...register('confirm', { required: 'Confirm password', validate: (x) => x === getValues('password') || 'Passwords do not match' })} />
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={busy}>{busy ? 'Submitting…' : 'Submit for verification'}</button>
        </div>
      </form>
    </div>
  );
}
