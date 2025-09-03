import { Package } from 'lucide-react';
import React from 'react';
import type { ProductTemplate } from '../types';

interface TemplateStatsProps {
  templates: ProductTemplate[];
}

const TemplateStats: React.FC<TemplateStatsProps> = ({ templates }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Plantillas</p>
            <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateStats;