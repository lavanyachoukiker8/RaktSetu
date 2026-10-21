import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FormInput, FormSelect, ToggleSwitch, Stepper } from '../components/Forms';
import { BloodGroupBadge } from '../components/Chips';
import { BLOOD_GROUPS, CITIES } from '../utils/constants';
import { ageFromDob, toInputDate } from '../utils/helpers';
import { attempt } from '../utils/notify';

const STEPS = ['Personal', 'Blood & location', 'Health', 'Account'];
const FIELDS = [
  ['name', 'dob', 'gender', 'phone', 'email'],
  ['group', 'city', 'area'],
  ['weight', 'noIllness', 'noTattoo', 'noTravel', 'consent'],
  ['password', 'confirm'],
];

export default function RegisterDonor() {
  const { registerDonor } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, trigger, watch, setValue, getValues, formState: { errors } } = useForm({
    mode: 'onTouched',
    defaultValues: { gender: 'M', available: true, noIllness: false, noTattoo: false, noTravel: false, consent: false },
  });
  const v = watch();
  const maxDob = toInputDate(new Date(Date.now() - 18 * 365.25 * 86400000));

  const next = async () => {
    if (await trigger(FIELDS[step])) setStep((s) => s + 1);
    else toast.error('Please fix the highlighted fields.', { id: 'step' });
  };

  const onSubmit = async (values) => {
    setBusy(true);
    const res = await attempt(() => registerDonor(values), { success: 'Registration complete. Welcome to RaktSetu!' });
    setBusy(false);
    if (res.ok) nav('/donor', { replace: true });
  };

  const must = (msg) => ({ validate: (x) => x === true || msg });

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-3xl font-extrabold">Become a donor</h1>
      <p className="muted mb-6">Four short steps. Your phone number stays private until you accept a request.</p>
      <div className="card p-5 sm:p-8">
        <Stepper steps={STEPS} current={step} />
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2 animate-fade-in">
              <FormInput className="sm:col-span-2" label="Full name" required autoComplete="name" error={errors.name?.message} {...register('name', { required: 'Full name is required', minLength: { value: 3, message: 'Enter your full name' } })} />
              <FormInput label="Date of birth" type="date" required max={maxDob} helper="You must be 18 to 65 years old" error={errors.dob?.message}
                {...register('dob', { required: 'Date of birth is required', validate: (d) => (ageFromDob(d) >= 18 && ageFromDob(d) <= 65) || 'Donors must be between 18 and 65 years old' })} />
              <FormSelect label="Gender" required options={[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }, { value: 'O', label: 'Other' }]} {...register('gender')} />
              <FormInput label="Phone" required inputMode="numeric" maxLength={10} placeholder="10-digit mobile" error={errors.phone?.message}
                {...register('phone', { required: 'Phone is required', pattern: { value: /^\d{10}$/, message: 'Phone must be exactly 10 digits' } })} />
              <FormInput label="Email" type="email" placeholder="you@example.com" error={errors.email?.message}
                {...register('email', { pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2 animate-fade-in">
              <FormSelect label="Blood group" required placeholder="Select" options={BLOOD_GROUPS} helper="Not sure? Ask at any blood bank." error={errors.group?.message} {...register('group', { required: 'Select your blood group' })} />
              <FormSelect label="City" required placeholder="Select" options={CITIES} error={errors.city?.message} {...register('city', { required: 'Select your city' })} />
              <FormInput className="sm:col-span-2" label="Area / pincode" required placeholder="e.g. Adajan, 395009" error={errors.area?.message} {...register('area', { required: 'Enter your area or pincode' })} />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <FormInput label="Weight (kg)" type="number" required helper="Minimum 45 kg to donate safely" error={errors.weight?.message}
                {...register('weight', { required: 'Enter your weight', min: { value: 45, message: 'You must weigh at least 45 kg to donate' }, max: { value: 200, message: 'Enter a valid weight' } })} />
              <fieldset className="space-y-2 rounded-xl bg-red-50 p-4">
                <legend className="label px-1">Health screening</legend>
                {[['noIllness', 'I have no major illness (e.g. heart disease, hepatitis, HIV, uncontrolled diabetes)'], ['noTattoo', 'I have had no tattoo or piercing in the last 6 months'], ['noTravel', 'I have not recently travelled to a malaria-risk area']].map(([k, label]) => (
                  <div key={k}>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input type="checkbox" className="mt-1 h-4 w-4 accent-red-600" {...register(k, must('You must meet this criterion to donate'))} /> {label}
                    </label>
                    {errors[k] && <p className="ml-7 text-xs font-semibold text-red-700" role="alert">{errors[k].message}</p>}
                  </div>
                ))}
              </fieldset>
              <ToggleSwitch checked={v.available} onChange={(x) => setValue('available', x)} label="I am currently available to donate" />
              <div>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-red-600" {...register('consent', must('Consent is required'))} />
                  I consent to RaktSetu sharing my name, blood group and city with verified hospitals, and my phone number only after I accept a request.
                </label>
                {errors.consent && <p className="ml-7 text-xs font-semibold text-red-700" role="alert">{errors.consent.message}</p>}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput label="Password" type="password" required autoComplete="new-password" helper="At least 6 characters" error={errors.password?.message}
                  {...register('password', { required: 'Choose a password', minLength: { value: 6, message: 'At least 6 characters' } })} />
                <FormInput label="Confirm password" type="password" required autoComplete="new-password" error={errors.confirm?.message}
                  {...register('confirm', { required: 'Confirm your password', validate: (x) => x === getValues('password') || 'Passwords do not match' })} />
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h2 className="mb-2 font-bold">Review your details</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="muted">Name</dt><dd className="font-semibold">{v.name}</dd>
                  <dt className="muted">Age</dt><dd className="font-semibold">{ageFromDob(v.dob) || '—'}</dd>
                  <dt className="muted">Phone</dt><dd className="font-semibold">{v.phone}</dd>
                  <dt className="muted">Blood group</dt><dd>{v.group && <BloodGroupBadge group={v.group} size="sm" />}</dd>
                  <dt className="muted">Location</dt><dd className="font-semibold">{v.area}, {v.city}</dd>
                  <dt className="muted">Available</dt><dd className="font-semibold">{v.available ? 'Yes' : 'Not right now'}</dd>
                </dl>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {step > 0 ? <button type="button" className="btn-outline" onClick={() => setStep((s) => s - 1)}><ArrowLeft size={16} /> Back</button> : <span />}
            {step < 3 ? (
              <button type="button" className="btn-primary" onClick={next}>Next <ArrowRight size={16} /></button>
            ) : (
              <button type="submit" className="btn-primary" disabled={busy}><Check size={16} /> {busy ? 'Creating account…' : 'Submit registration'}</button>
            )}
          </div>
        </form>
      </div>
      <p className="muted mt-4 text-center text-sm">Already registered? <Link to="/login" className="font-bold text-red-700 underline">Log in</Link></p>
    </div>
  );
}
