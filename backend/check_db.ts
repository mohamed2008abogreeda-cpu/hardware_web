import { getAllRepairs } from './src/config/access-reader';
import { env } from './src/config/env';

try {
  const repairs = getAllRepairs();
  console.log('Total repairs found in Access DB:', repairs.length);
  if (repairs.length > 0) {
    console.log('First device code:', repairs[0].rep_code);
  } else {
    console.log('No repairs found - DB might be empty or inaccessible');
  }
} catch (e) {
  console.error('Failed to read and access DB:', e.message);
}
