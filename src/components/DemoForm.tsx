import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ApiService } from '@/services/api';

const demoFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  school: z.string().min(2, 'Nome da escola deve ter pelo menos 2 caracteres'),
  role: z.enum(['director', 'teacher', 'parent', 'security', 'other'], {
    required_error: 'Selecione um papel',
  }),
  message: z.string().optional(),
});

type DemoFormData = z.infer<typeof demoFormSchema>;

interface DemoFormProps {
  onSuccess?: () => void;
}

export const DemoForm: React.FC<DemoFormProps> = ({ onSuccess }) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DemoFormData>({
    resolver: zodResolver(demoFormSchema),
  });

  const onSubmit = async (data: DemoFormData) => {
    const response = await ApiService.submitDemoRequest({
      name: data.name,
      email: data.email,
      school: data.school,
      role: data.role,
      message: data.message,
    });

    if (response.error) {
      toast({
        title: 'Erro ao enviar pedido',
        description: response.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Pedido de demonstração enviado!',
        description: 'Entraremos em contato em breve.',
      });
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md mx-auto">
      <div>
        <Label htmlFor="name">Nome Completo</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Seu nome completo"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="seu@email.com"
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="school">Nome da Escola</Label>
        <Input
          id="school"
          {...register('school')}
          placeholder="Nome da sua escola"
          className={errors.school ? 'border-red-500' : ''}
        />
        {errors.school && <p className="text-red-500 text-sm mt-1">{errors.school.message}</p>}
      </div>

      <div>
        <Label htmlFor="role">Seu Papel</Label>
        <Select onValueChange={(value) => setValue('role', value as any)}>
          <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
            <SelectValue placeholder="Selecione seu papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="director">Diretor</SelectItem>
            <SelectItem value="teacher">Professor</SelectItem>
            <SelectItem value="security">Segurança/Portaria</SelectItem>
            <SelectItem value="parent">Pai/Mãe</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>}
      </div>

      <div>
        <Label htmlFor="message">Mensagem (Opcional)</Label>
        <Textarea
          id="message"
          {...register('message')}
          placeholder="Conte-nos mais sobre suas necessidades..."
          rows={4}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Enviando...' : 'Solicitar Demonstração'}
      </Button>
    </form>
  );
};</content>
<parameter name="filePath">c:\Users\AEAO\Desktop\Santos\website-guide eduguard360\src\components\DemoForm.tsx