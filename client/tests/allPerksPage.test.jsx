// tests/allPerksPage.test.jsx
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import AllPerks from '../src/pages/AllPerks.jsx';
import { renderWithRouter } from './utils/renderWithRouter.js';
import { AuthProvider } from '../src/context/AuthContext.jsx';

/** Adjust if your runner sets a different base */
const API_BASE =
  (process.env.TEST_API_BASE && process.env.TEST_API_BASE.replace(/\/$/, '')) ||
  'http://localhost:4100/api';

async function apiFetch(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[apiFetch] ${init.method || 'GET'} ${path} -> ${res.status}\n${text}`);
  }
  return res;
}

async function getToken() {
  if (global._TEST_CONTEXT_?.token) return global._TEST_CONTEXT_.token;
  global._TEST_CONTEXT_ ||= {};

  const uniq = Date.now();
  const { token } = await apiFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `AllPerks Seeder ${uniq}`,
      email: `allperks.seeder.${uniq}@example.com`,
      password: `P@ssw0rd-${uniq}`,
    }),
  }).then((r) => r.json());

  if (!token) throw new Error('No token returned from /auth/register');
  global._TEST_CONTEXT_.token = token;
  return token;
}

async function seedPerkVisibleToDirectory() {
  if (global._TEST_CONTEXT_?.seededPerk) return global._TEST_CONTEXT_.seededPerk;
  global._TEST_CONTEXT_ ||= {};

  const token = await getToken();

  // 1) Try to reuse an existing directory-visible perk.
  try {
    const probeJson = await apiFetch('/perks/public?limit=1', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());

    const candidate = Array.isArray(probeJson?.perks) ? probeJson.perks[0] : probeJson?.[0];
    if (candidate?.title && candidate?.merchant) {
      global._TEST_CONTEXT_.seededPerk = candidate;
      return candidate;
    }
  } catch {
    // Ignore; we’ll create one.
  }

  // 2) Create a new perk (NOTE: do NOT send `isPublic`; your schema forbids it).
  const uniq = Date.now();
  const newPerk = {
    title: `Seeded Test Perk ${uniq}`,
    merchant: `Merchant ${uniq}`,
    category: 'other',
    discountPercent: 10,
    description: 'Seeded by AllPerks tests',
    // isPublic: true, // ❌ schema says "isPublic" is not allowed
  };

  const created = await apiFetch('/perks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(newPerk),
  }).then((r) => r.json());

  const stored = created?.perk ?? created;
  if (!stored?._id) throw new Error('Unexpected create-perk response shape');

  // 3) Optional: if your API needs an explicit publish step, do it here.
  // If you have such an endpoint, uncomment and adjust:
  // await apiFetch(`/perks/${stored._id}/publish`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${token}` },
  // });

  global._TEST_CONTEXT_.seededPerk = stored;
  return stored;
}

describe('AllPerks page (Directory)', () => {
  beforeAll(async () => {
    await seedPerkVisibleToDirectory();
  }, 20000);

  test(
    'lists public perks and responds to name filtering',
    async () => {
      const seededPerk = global._TEST_CONTEXT_.seededPerk;

      renderWithRouter(
        <AuthProvider>
          <Routes>
            <Route path="/explore" element={<AllPerks />} />
          </Routes>
        </AuthProvider>,
        { initialEntries: ['/explore'] }
      );

      await waitFor(
        () => {
          expect(screen.getByText(seededPerk.title)).toBeInTheDocument();
        },
        { timeout: 15000 }
      );

      const nameFilter = screen.getByPlaceholderText('Enter perk name...');
      fireEvent.change(nameFilter, { target: { value: seededPerk.title } });

      await waitFor(
        () => {
          expect(screen.getByText(seededPerk.title)).toBeInTheDocument();
        },
        { timeout: 15000 }
      );

      expect(screen.getByText(/showing/i)).toHaveTextContent('Showing');
    },
    30000
  );

  test(
    'lists public perks and responds to merchant filtering',
    async () => {
      const seededPerk = global._TEST_CONTEXT_.seededPerk;

      renderWithRouter(
        <AuthProvider>
          <Routes>
            <Route path="/explore" element={<AllPerks />} />
          </Routes>
        </AuthProvider>,
        { initialEntries: ['/explore'] }
      );

      await waitFor(
        () => {
          expect(screen.getByText(seededPerk.title)).toBeInTheDocument();
        },
        { timeout: 15000 }
      );

      // Merchant dropdown (first combobox)
      const dropdowns = screen.getAllByRole('combobox');
      const merchantDropdown = dropdowns[0];
      fireEvent.change(merchantDropdown, { target: { value: seededPerk.merchant } });

      await waitFor(
        () => {
          expect(screen.getByText(seededPerk.title)).toBeInTheDocument();
        },
        { timeout: 15000 }
      );

      expect(screen.getByText(/showing/i)).toHaveTextContent('Showing');
    },
    30000
  );
});
