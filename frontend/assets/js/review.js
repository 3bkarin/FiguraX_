import { publicApi } from './api.js';
import { initLanguage, loadTranslations, translatePage, getLanguage, onLanguageChange } from './i18n.js';
import { showToast } from './common.js';

const token = new URLSearchParams(window.location.search).get('token');
let requestData = null;

async function loadLanguage(lang) {
  const response = await fetch(`locales/${lang}.json`);
  const data = await response.json();
  loadTranslations(lang, data);
  translatePage();
}

function setMessage(message, type = 'info') {
  const el = document.getElementById('reviewMessage');
  if (!el) return;
  el.hidden = false;
  el.className = `review-message ${type}`;
  el.textContent = message;
}

function selectRating(rating) {
  document.getElementById('rating').value = String(rating);
  document.querySelectorAll('#starRating button').forEach(button => {
    button.classList.toggle('selected', Number(button.dataset.rating) <= rating);
    button.setAttribute('aria-checked', String(Number(button.dataset.rating) === rating));
  });
}

async function init() {
  initLanguage();
  try {
    await loadLanguage(getLanguage());
  } catch (error) {
    console.error('Failed to load review language:', error);
  }
  onLanguageChange(loadLanguage);

  const loading = document.getElementById('reviewLoading');
  const card = document.getElementById('reviewCard');
  if (!token) {
    loading.textContent = 'رابط التقييم غير صالح أو منتهي.';
    return;
  }

  try {
    const response = await publicApi.reviewRequest(token);
    requestData = response?.data;
    document.getElementById('reviewCustomer').textContent = requestData.customerName || '';
    document.getElementById('reviewOrder').textContent = requestData.orderId || '';
    document.getElementById('reviewProducts').textContent = (requestData.items || []).map(item => item.name).join(getLanguage() === 'ar' ? '، ' : ', ');
    loading.hidden = true;
    card.hidden = false;

    if (requestData.alreadySubmitted) {
      document.getElementById('reviewForm').hidden = true;
      setMessage(getLanguage() === 'ar' ? 'تم إرسال تقييمك من قبل ❤️' : 'You have already submitted your review ❤️', 'success');
      return;
    }
  } catch (error) {
    loading.textContent = error?.message || (getLanguage() === 'ar' ? 'رابط التقييم غير صالح أو منتهي.' : 'This review link is invalid or expired.');
    return;
  }

  document.querySelectorAll('#starRating button').forEach(button => {
    button.addEventListener('click', () => selectRating(Number(button.dataset.rating)));
  });

  document.getElementById('reviewForm').addEventListener('submit', async event => {
    event.preventDefault();
    const rating = Number(document.getElementById('rating').value);
    const content = document.getElementById('reviewComment').value.trim();
    if (!rating || content.length < 3) {
      setMessage(getLanguage() === 'ar' ? 'من فضلك اختر التقييم واكتب رأيك.' : 'Please choose a rating and write your review.', 'error');
      return;
    }

    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      await publicApi.submitReview({ token, rating, content });
      event.currentTarget.hidden = true;
      setMessage(getLanguage() === 'ar' ? 'شكراً ليك! تم إرسال تقييمك بنجاح ❤️' : 'Thank you! Your review was submitted successfully ❤️', 'success');
      showToast(getLanguage() === 'ar' ? 'تم إرسال التقييم' : 'Review submitted', 'success');
    } catch (error) {
      setMessage(error?.message || (getLanguage() === 'ar' ? 'حدث خطأ أثناء إرسال التقييم.' : 'Something went wrong while submitting your review.'), 'error');
      submitButton.disabled = false;
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
