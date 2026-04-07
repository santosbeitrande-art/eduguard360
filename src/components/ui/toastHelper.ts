// src/components/ui/toastHelper.ts
interface ToastOptions {
  title: string;
  description?: string;
}

export const toast = ({ title, description }: ToastOptions) => {
  // Aqui usamos alert simples, mas você pode customizar com seu próprio componente ou CSS
  if (description) {
    alert(`${title}\n${description}`);
  } else {
    alert(title);
  }
};