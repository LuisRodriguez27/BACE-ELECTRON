import React from 'react';
import { Star, TrendingUp, Package, BarChart3 } from 'lucide-react';
import type { ProductTemplate, TemplateUsageStats } from '../types';

interface TemplateStatsProps {
  templates: ProductTemplate[];
  usageStats: TemplateUsageStats[];
}

const TemplateStats: React.FC<TemplateStatsProps> = ({ templates, usageStats }) => {
  const getMostUsedTemplates = () => {
    return usageStats
      .filter(stat => stat.usage_count > 0)
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 5);
  };

  const getTotalUsages = () => {
    return usageStats.reduce((acc, stat) => acc + stat.usage_count, 0);
  };

  const getUsedTemplatesCount = () => {
    return usageStats.filter(s => s.usage_count > 0).length;
  };

  const mostPopular = getMostUsedTemplates()[0];

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

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Plantillas Usadas</p>
            <p className="text-2xl font-bold text-gray-900">{getUsedTemplatesCount()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Usos Totales</p>
            <p className="text-2xl font-bold text-gray-900">{getTotalUsages()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Star className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Más Popular</p>
            <p className="text-sm font-bold text-gray-900 truncate">
              {mostPopular?.description || 'N/A'}
            </p>
            <p className="text-xs text-gray-500">
              {mostPopular?.usage_count || 0} usos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateStats;