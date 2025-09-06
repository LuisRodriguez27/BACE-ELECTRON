import { BarChart3, DollarSign, Package, Ruler } from 'lucide-react';
import React from 'react';
import type { ProductTemplate } from '../types';

interface TemplateStatsProps {
  templates: ProductTemplate[];
}

const TemplateStats: React.FC<TemplateStatsProps> = ({ templates }) => {
  const totalTemplates = templates.length;
  const averagePrice = totalTemplates > 0 
    ? templates.reduce((sum, t) => sum + t.final_price, 0) / totalTemplates 
    : 0;
  const minPrice = totalTemplates > 0 
    ? Math.min(...templates.map(t => t.final_price)) 
    : 0;
  const maxPrice = totalTemplates > 0 
    ? Math.max(...templates.map(t => t.final_price)) 
    : 0;
  const templatesWithDimensions = templates.filter(t => t.width && t.height).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Plantillas</p>
            <p className="text-2xl font-bold text-gray-900">{totalTemplates}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Precio Promedio</p>
            <p className="text-2xl font-bold text-gray-900">
              ${averagePrice.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Rango de Precios</p>
            <p className="text-lg font-bold text-gray-900">
              ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Ruler className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Con Dimensiones</p>
            <p className="text-2xl font-bold text-gray-900">
              {templatesWithDimensions}/{totalTemplates}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateStats;