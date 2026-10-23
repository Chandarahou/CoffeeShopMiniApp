<script setup>
import { onMounted, ref } from 'vue';
import Swal from 'sweetalert2';
import { Copy, ImageUp } from 'lucide-vue-next';
import { api, uploadImage } from '../lib/api.js';

// Manual image hosting: staff upload a photo here, copy the URL it gets on the internet
// (Cloudflare R2), and paste it into a product's "Image URL" field themselves.
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const uploadsEnabled = ref(null); // null while loading
const maxBytes = ref(1.5 * 1024 * 1024);
const uploading = ref(false);
const error = ref('');
const lastUrl = ref('');
const copiedLast = ref(false);
const fileInput = ref(null);

onMounted(async () => {
  try {
    const status = await api('/admin/uploads/status');
    uploadsEnabled.value = status.imageUploads;
    maxBytes.value = status.maxImageBytes;
  } catch {
    uploadsEnabled.value = false;
  }
});

function megabytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}

/** Copies text to the clipboard. Returns true if it worked. */
async function copyText(text, inputToSelect) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers or a blocked clipboard: fall back to selecting the field and copying
    if (inputToSelect) {
      inputToSelect.select();
      try {
        return document.execCommand('copy');
      } catch {
        return false;
      }
    }
    return false;
  }
}

function checkFile(file) {
  if (file.type.startsWith('video/')) {
    return "Videos can't be uploaded. Please choose an image.";
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Please choose a JPEG, PNG or WebP image.';
  }
  if (file.size > maxBytes.value) {
    return `That image is ${megabytes(file.size)}. The limit is ${megabytes(maxBytes.value)}.`;
  }
  return '';
}

async function onFileChosen(event) {
  const file = event.target.files[0];
  // Reset so choosing the same file again still triggers a change
  event.target.value = '';
  if (!file) {
    return;
  }

  error.value = checkFile(file);
  if (error.value) {
    return;
  }

  let uploadedUrl = '';
  uploading.value = true;
  try {
    const result = await uploadImage('/admin/uploads/image', file);
    uploadedUrl = result.url;
    lastUrl.value = uploadedUrl;
    copiedLast.value = false;
  } catch (err) {
    error.value = err.message;
  } finally {
    uploading.value = false;
  }

  // Kept apart from the upload so a problem with the pop-up can never look like a failed
  // upload; the URL is shown under "Last upload" either way
  if (uploadedUrl) {
    try {
      await showSuccess(uploadedUrl);
    } catch (popupError) {
      console.error('Could not show the upload pop-up:', popupError);
    }
  }
}

/** "Upload successful" pop-up with the new image's URL and a Copy button. */
async function showSuccess(url) {
  // Built as elements (not an HTML string) so the URL can never be read as markup
  const content = document.createElement('div');

  const preview = document.createElement('img');
  preview.src = url;
  preview.alt = 'The image you just uploaded';
  preview.style.cssText = 'max-height:160px;max-width:100%;margin:0 auto 12px;border-radius:8px;display:block;';

  const label = document.createElement('label');
  label.textContent = 'Image URL';
  label.htmlFor = 'uploaded-image-url';
  label.style.cssText = 'display:block;text-align:left;font-size:14px;font-weight:600;margin-bottom:4px;';

  const urlField = document.createElement('input');
  urlField.id = 'uploaded-image-url';
  urlField.type = 'text';
  urlField.readOnly = true;
  urlField.value = url;
  urlField.style.cssText = 'width:100%;font-size:13px;padding:8px;border:1px solid #d1d5db;border-radius:8px;font-family:monospace;color:inherit;background:transparent;';
  urlField.addEventListener('focus', () => urlField.select());

  const hint = document.createElement('p');
  hint.textContent = "Paste this URL into a product's Image URL field.";
  hint.style.cssText = 'font-size:13px;margin-top:8px;opacity:0.75;';

  content.append(preview, label, urlField, hint);

  const dark = document.documentElement.classList.contains('dark');
  await Swal.fire({
    icon: 'success',
    title: 'Upload successful',
    html: content,
    iconColor: '#517c38',
    showCancelButton: true,
    confirmButtonText: 'Copy URL',
    cancelButtonText: 'Close',
    confirmButtonColor: '#517c38',
    cancelButtonColor: '#6b7280',
    background: dark ? '#1b1f1b' : undefined,
    color: dark ? '#e8ece6' : undefined,
    // Copying keeps the pop-up open so staff can see it worked
    preConfirm: async () => {
      const copied = await copyText(url, urlField);
      if (copied) {
        Swal.getConfirmButton().textContent = 'Copied!';
        copiedLast.value = true;
      } else {
        Swal.showValidationMessage('Could not copy. Select the URL and copy it yourself.');
      }
      return false;
    },
  });
}

async function copyLast() {
  copiedLast.value = await copyText(lastUrl.value, null);
}
</script>

<template>
  <h1 class="text-2xl font-bold">Images</h1>
  <p class="mt-1 text-sm text-muted">Upload a photo, copy its URL, then paste it into a product's <strong>Image URL</strong> field.</p>

  <p v-if="uploadsEnabled === false" class="card mt-6 max-w-xl bg-honey-soft p-4 text-sm text-amber-900">
    Image uploads aren't set up yet. Add the Cloudflare R2 settings to the server (see DEPLOY.md) and restart it.
  </p>

  <section v-else-if="uploadsEnabled" class="card mt-6 max-w-xl p-6">
    <div class="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center">
      <ImageUp class="size-10 text-muted" aria-hidden="true" />
      <button type="button" class="btn-primary" :disabled="uploading" @click="fileInput.click()">
        {{ uploading ? 'Uploading…' : 'Upload image' }}
      </button>
      <p class="text-xs text-muted">JPEG, PNG or WebP · up to {{ megabytes(maxBytes) }} · videos can't be uploaded</p>
      <input
        ref="fileInput"
        type="file"
        :accept="ACCEPTED_TYPES.join(',')"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        @change="onFileChosen"
      />
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-700" role="alert">{{ error }}</p>

    <div v-if="lastUrl" class="mt-5 border-t pt-4">
      <p class="text-sm font-medium">Last upload</p>
      <div class="mt-2 flex gap-2">
        <input :value="lastUrl" type="text" readonly class="input font-mono text-xs" aria-label="Last uploaded image URL" @focus="$event.target.select()" />
        <button type="button" class="btn shrink-0" @click="copyLast">
          <Copy class="size-4" /> {{ copiedLast ? 'Copied!' : 'Copy' }}
        </button>
      </div>
    </div>
  </section>
</template>
